import { query } from '../config/db.js';
import { pagesRepository } from '../repositories/pagesRepository.js';
import { mediaRepository, OVERSIZED_BYTES } from '../repositories/mediaRepository.js';
import { redirectsRepository } from '../repositories/redirectsRepository.js';
import logger from '../utils/logger.js';

/**
 * SEO audit engine.
 *
 * Every finding here is produced by an automated check against real database
 * content - nothing is estimated, simulated or scored arbitrarily. Checks that
 * genuinely require human judgement are *not* fabricated; the UI reports these
 * results as "automated" and reserves human review for the admin.
 *
 * The health score is deliberately transparent: it starts at 100 and subtracts
 * a fixed weight per finding (critical 10, warning 4, notice 1), floored at 0.
 */

export const SEVERITY_WEIGHT = { critical: 10, warning: 4, notice: 1 };

const TITLE_MAX = 60;
const TITLE_MIN = 15;
const META_MAX = 160;
const META_MIN = 50;

/** Filenames that carry no descriptive value for image search. */
const GENERIC_FILENAME = /^(img|image|photo|pic|dsc|screenshot|untitled|download|file|asset)[-_]?\d*$/i;

const issueKey = (checkKey, pageId, assetId) => `${checkKey}|${pageId ?? ''}|${assetId ?? ''}`;

/** Strip the uploader's unique prefix so generic names can be recognised. */
function descriptivePart(filename) {
  return String(filename)
    .replace(/^\d+-\w{8}-/, '')
    .replace(/\.[^.]+$/, '');
}

function isGenericFilename(filename) {
  const part = descriptivePart(filename);
  return part.length < 4 || GENERIC_FILENAME.test(part);
}

/** Automated checks for a single published page. */
function pageChecks(page, context) {
  const issues = [];
  const seo = page.seo || {};
  const push = (checkKey, category, severity, message, recommendation, detail = null) =>
    issues.push({ checkKey, category, severity, message, recommendation, detail, pageId: page.id });

  const title = (seo.seoTitle || '').trim();
  const description = (seo.metaDescription || '').trim();

  if (!title) {
    push('title.missing', 'title', 'warning', `"${page.route}" has no SEO title.`, 'Add a descriptive SEO title of around 60 characters.');
  } else if (title.length > TITLE_MAX) {
    push('title.length', 'title', 'notice', `The title for "${page.route}" is ${title.length} characters (recommended maximum ${TITLE_MAX}).`, 'Shorten it so search engines do not truncate it.');
  } else if (title.length < TITLE_MIN) {
    push('title.length', 'title', 'notice', `The title for "${page.route}" is only ${title.length} characters.`, 'Make the title more descriptive.');
  }

  if (!description) {
    push('meta.missing', 'meta', 'warning', `"${page.route}" has no meta description.`, 'Write a 50-160 character summary that describes the page.');
  } else if (description.length > META_MAX) {
    push('meta.length', 'meta', 'notice', `The meta description for "${page.route}" is ${description.length} characters (recommended maximum ${META_MAX}).`, 'Trim it to avoid truncation.');
  } else if (description.length < META_MIN) {
    push('meta.length', 'meta', 'notice', `The meta description for "${page.route}" is only ${description.length} characters.`, 'Expand it to describe the page more fully.');
  }

  if (title && context.titleOwners.get(title) > 1) {
    push('title.duplicate', 'title', 'warning', `The title "${title}" is used by ${context.titleOwners.get(title)} pages.`, 'Give each page a unique title.');
  }
  if (description && context.descriptionOwners.get(description) > 1) {
    push('meta.duplicate', 'meta', 'warning', 'This meta description is duplicated on another page.', 'Write a unique description for this page.');
  }

  const activeSections = (page.sections || []).filter((section) => section.isActive);
  const h1s = activeSections.filter((section) => section.headingLevel === 'h1');
  if (activeSections.length > 0 && h1s.length === 0) {
    push('headings.missing_h1', 'headings', 'warning', `"${page.route}" has editable sections but no H1 heading.`, 'Promote the page title section to H1.');
  }
  if (h1s.length > 1) {
    push('headings.multiple_h1', 'headings', 'critical', `"${page.route}" has ${h1s.length} H1 headings.`, 'Keep exactly one H1 per page and use H2/H3 for the rest.');
  }

  const imagesMissingAlt = activeSections.filter((section) => section.imageUrl && !(section.imageAlt || '').trim());
  if (imagesMissingAlt.length > 0) {
    push('images.missing_alt', 'images', 'warning', `${imagesMissingAlt.length} section image(s) on "${page.route}" have no alt text.`, 'Describe what each image shows.');
  }

  if (seo.canonicalUrl) {
    try {
      const canonical = new URL(seo.canonicalUrl);
      if (canonical.pathname !== page.route) {
        push('canonical.mismatch', 'canonical', 'notice', `The canonical URL for "${page.route}" points to "${canonical.pathname}".`, 'Point the canonical at this page, or confirm the intentional consolidation.');
      }
    } catch {
      push('canonical.invalid', 'canonical', 'warning', `The canonical URL for "${page.route}" is not a valid absolute URL.`, 'Use a full https:// URL or leave the field empty to use the page URL.');
    }
  }

  if (page.isIndexable && /noindex/i.test(seo.metaRobots || '')) {
    push('indexing.noindex', 'indexing', 'critical', `"${page.route}" is published but its robots directive contains "noindex".`, 'Remove noindex or unpublish the page - it cannot rank while noindex is set.');
  }
  if (!page.isIndexable) {
    push('indexing.not_indexable', 'indexing', 'notice', `"${page.route}" is excluded from search indexing.`, 'Confirm this is intentional.');
  }

  if (!page.slug && !page.isSystem) {
    push('slug.missing', 'canonical', 'notice', `"${page.route}" has no slug recorded.`, 'Record a slug so future route changes can redirect cleanly.');
  }

  if (['service', 'services'].includes(page.pageType) && !seo.structuredData) {
    push('structured_data.missing', 'structured_data', 'notice', `"${page.route}" has no page-specific structured data.`, 'Add truthful Service schema describing this page.');
  }

  for (const section of activeSections) {
    const target = (section.ctaUrl || '').trim();
    if (!target.startsWith('/') || target.startsWith('//')) continue;
    const targetPath = target.split(/[?#]/)[0];
    if (context.knownRoutes.has(targetPath)) continue;
    if (context.redirectSources.has(targetPath)) continue;
    push(
      'links.unregistered_target',
      'links',
      'warning',
      `A call-to-action on "${page.route}" points to "${targetPath}", which is not a registered route or redirect.`,
      'Register the route, add a redirect, or correct the link.',
    );
  }

  return issues;
}

/** Automated checks for a single media asset. */
function assetChecks(asset) {
  const issues = [];
  const push = (checkKey, severity, message, recommendation) =>
    issues.push({ checkKey, category: 'images', severity, message, recommendation, assetId: asset.id });

  if (!(asset.altText || '').trim()) {
    push('images.missing_alt', 'warning', `"${asset.filename}" has no alt text.`, 'Add meaningful alt text describing the image.');
  }
  if (asset.sizeBytes > OVERSIZED_BYTES) {
    const kb = Math.round(asset.sizeBytes / 1024);
    push('images.oversized', 'warning', `"${asset.filename}" is ${kb} KB, over the ${Math.round(OVERSIZED_BYTES / 1024)} KB guideline.`, 'Re-upload a compressed version or use a generated WebP/AVIF rendition.');
  }
  if (!asset.width || !asset.height) {
    push('images.missing_dimensions', 'notice', `"${asset.filename}" has no recorded width/height.`, 'Set explicit dimensions to prevent layout shift.');
  }
  if (isGenericFilename(asset.filename)) {
    push('images.generic_filename', 'notice', `"${asset.filename}" has a non-descriptive filename.`, 'Rename the file to describe its content, e.g. "ielts-coaching-class-navi-mumbai.webp".');
  }
  return issues;
}

/** Automated checks for the redirect rule set. */
function redirectChecks(redirects) {
  const issues = [];
  const bySource = new Map(redirects.map((row) => [row.sourcePath, row]));
  const seen = new Set();

  for (const row of redirects) {
    if (!row.isActive) continue;
    const key = issueKey('redirect.chain', null, null);
    const next = bySource.get(row.destinationPath);
    if (!next || next.id === row.id || !next.isActive) continue;

    const isLoop = next.destinationPath === row.sourcePath;
    const dedupe = `${row.sourcePath}->${row.destinationPath}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    issues.push({
      checkKey: isLoop ? 'redirect.loop' : 'redirect.chain',
      category: 'redirects',
      severity: isLoop ? 'critical' : 'warning',
      message: isLoop
        ? `The redirect "${row.sourcePath}" -> "${row.destinationPath}" forms a loop.`
        : `"${row.sourcePath}" redirects to "${row.destinationPath}", which redirects again to "${next.destinationPath}".`,
      recommendation: 'Point the redirect directly at the final destination.',
      detail: key,
    });
  }
  return issues;
}

/** Compute a transparent health score from a list of findings. */
export function scoreFor(issues) {
  const penalty = issues.reduce((sum, issue) => sum + (SEVERITY_WEIGHT[issue.severity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}

/**
 * Run a full audit: scan every published page, media asset and redirect, then
 * persist the findings. Previously ignored findings stay ignored.
 */
export async function runAudit(triggeredBy = null) {
  const started = Date.now();
  const insert = await query(
    'INSERT INTO seo_audits (triggered_by, scope, started_at) VALUES (?, ?, NOW())',
    [triggeredBy, 'full'],
  );
  const auditId = insert.insertId;

  const ignoredRows = await query("SELECT check_key, page_id, asset_id FROM seo_issues WHERE status = 'ignored'");
  const ignored = new Set(ignoredRows.map((row) => issueKey(row.check_key, row.page_id, row.asset_id)));

  // Automated findings are a snapshot; admin decisions (ignored) are preserved.
  await query('DELETE FROM seo_issues WHERE is_automated = 1');

  const pageRows = await pagesRepository.list({});
  const published = pageRows.filter((page) => page.status === 'published');

  const fullPages = [];
  for (const page of published) {
    // eslint-disable-next-line no-await-in-loop -- small registry, needs sections
    fullPages.push(await pagesRepository.findById(page.id));
  }

  const redirects = await redirectsRepository.list({});
  const assets = await mediaRepository.list({ perPage: 500 });

  const titleOwners = new Map();
  const descriptionOwners = new Map();
  for (const page of fullPages) {
    const title = (page.seo?.seoTitle || '').trim();
    const description = (page.seo?.metaDescription || '').trim();
    if (title) titleOwners.set(title, (titleOwners.get(title) || 0) + 1);
    if (description) descriptionOwners.set(description, (descriptionOwners.get(description) || 0) + 1);
  }

  const context = {
    titleOwners,
    descriptionOwners,
    knownRoutes: new Set([
      ...pageRows.map((page) => page.route),
      '/',
      '/services',
    ]),
    redirectSources: new Set(redirects.map((row) => row.sourcePath)),
  };

  const allIssues = [
    ...fullPages.flatMap((page) => pageChecks(page, context)),
    ...assets.items.flatMap((asset) => assetChecks(asset)),
    ...redirectChecks(redirects),
  ];

  const deduped = new Map();
  for (const issue of allIssues) {
    const key = issueKey(issue.checkKey, issue.pageId, issue.assetId);
    if (ignored.has(key) || deduped.has(key)) continue;
    deduped.set(key, issue);
  }

  for (const issue of deduped.values()) {
    // eslint-disable-next-line no-await-in-loop -- sequential inserts keep the audit atomic-ish
    await query(
      `INSERT INTO seo_issues
         (audit_id, page_id, asset_id, check_key, category, severity, message, detail, recommendation, is_automated, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'open')`,
      [
        auditId,
        issue.pageId ?? null,
        issue.assetId ?? null,
        issue.checkKey,
        issue.category,
        issue.severity,
        issue.message.slice(0, 500),
        issue.detail ?? null,
        issue.recommendation ?? null,
      ],
    );
  }

  const issuesFound = deduped.size;
  const pagesScanned = fullPages.length;

  await query('UPDATE seo_audits SET pages_scanned = ?, issues_found = ?, finished_at = NOW() WHERE id = ?', [
    pagesScanned,
    issuesFound,
    auditId,
  ]);

  logger.info('SEO audit complete', { auditId, pagesScanned, issuesFound, durationMs: Date.now() - started });

  return getHealth();
}

/** Latest audit summary, per-page findings and prioritised actions. */
export async function getHealth() {
  const latest = await query(
    'SELECT * FROM seo_audits ORDER BY started_at DESC, id DESC LIMIT 1',
  );
  const audit = latest[0] ?? null;

  const issues = await query(
    `SELECT i.*, p.route AS page_route, p.name AS page_name, m.filename AS asset_filename
     FROM seo_issues i
     LEFT JOIN pages p ON p.id = i.page_id
     LEFT JOIN media_assets m ON m.id = i.asset_id
     ORDER BY FIELD(i.severity, 'critical', 'warning', 'notice', 'good'), i.detected_at DESC`,
  );

  const mapped = issues.map((row) => ({
    id: Number(row.id),
    auditId: row.audit_id === null ? null : Number(row.audit_id),
    pageId: row.page_id === null ? null : Number(row.page_id),
    assetId: row.asset_id === null ? null : Number(row.asset_id),
    checkKey: row.check_key,
    category: row.category,
    severity: row.severity,
    message: row.message,
    detail: row.detail,
    recommendation: row.recommendation,
    status: row.status,
    isAutomated: Boolean(row.is_automated),
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    pageRoute: row.page_route,
    pageName: row.page_name,
    assetFilename: row.asset_filename,
  }));

  const byPage = new Map();
  for (const issue of mapped) {
    const key = issue.pageId ?? 'site';
    if (!byPage.has(key)) {
      byPage.set(key, {
        pageId: issue.pageId,
        route: issue.pageRoute,
        name: issue.pageName,
        issues: [],
      });
    }
    byPage.get(key).issues.push(issue);
  }

  const pages = [...byPage.values()].map((entry) => ({
    ...entry,
    score: scoreFor(entry.issues),
    counts: {
      critical: entry.issues.filter((issue) => issue.severity === 'critical').length,
      warning: entry.issues.filter((issue) => issue.severity === 'warning').length,
      notice: entry.issues.filter((issue) => issue.severity === 'notice').length,
    },
  }));

  const pageScores = pages.filter((page) => page.pageId !== null).map((page) => page.score);
  const overallScore = pageScores.length > 0 ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length) : 100;

  const counts = {
    total: mapped.length,
    critical: mapped.filter((issue) => issue.severity === 'critical').length,
    warning: mapped.filter((issue) => issue.severity === 'warning').length,
    notice: mapped.filter((issue) => issue.severity === 'notice').length,
    open: mapped.filter((issue) => issue.status === 'open').length,
    fixed: mapped.filter((issue) => issue.status === 'fixed').length,
    ignored: mapped.filter((issue) => issue.status === 'ignored').length,
  };

  const byCategory = {};
  for (const issue of mapped) {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  return {
    audit: audit
      ? {
          id: Number(audit.id),
          scope: audit.scope,
          pagesScanned: Number(audit.pages_scanned),
          issuesFound: Number(audit.issues_found),
          startedAt: audit.started_at,
          finishedAt: audit.finished_at,
        }
      : null,
    generatedAt: new Date().toISOString(),
    score: overallScore,
    scoreFormula: '100 minus 10 per critical, 4 per warning and 1 per notice finding, floored at 0.',
    counts,
    byCategory,
    pages,
    issues: mapped,
    // Explicitly separated so the UI never presents a judgement call as a test result.
    automated: mapped.filter((issue) => issue.isAutomated),
  };
}

/** Update the admin-controlled state of a finding. */
export async function setIssueStatus(id, status) {
  const resolved = ['fixed', 'ignored'].includes(status) ? 'NOW()' : 'NULL';
  await query(`UPDATE seo_issues SET status = ?, resolved_at = ${resolved} WHERE id = ?`, [status, id]);
  const rows = await query('SELECT * FROM seo_issues WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

export default { runAudit, getHealth, setIssueStatus, scoreFor, SEVERITY_WEIGHT };
