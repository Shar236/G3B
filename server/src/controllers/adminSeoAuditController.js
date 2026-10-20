import { getHealth, runAudit, setIssueStatus } from '../services/seoAudit.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';

/**
 * SEO health dashboard endpoints.
 *
 * `getHealth` returns real, computed findings only. Anything requiring human
 * judgement is exposed under `automated` (test-verified) versus the separate
 * admin-working states, so the UI never presents a guess as a measurement.
 */

/** GET /api/admin/seo/health */
export async function seoHealth(_req, res) {
  res.json({ success: true, data: await getHealth() });
}

/** POST /api/admin/seo/audit - re-run every automated check against live data. */
export async function runSeoAudit(req, res) {
  const health = await runAudit(req.user?.id ?? null);
  await recordAudit(req, {
    action: 'seo.audit',
    entityType: 'seo',
    summary: `Ran an SEO audit: ${health.counts.total} finding(s) across ${health.audit?.pagesScanned ?? 0} page(s)`,
  });
  res.json({ success: true, data: health });
}

/** PATCH /api/admin/seo/issues/:id - mark a finding fixed or ignored. */
export async function updateSeoIssue(req, res) {
  const issue = await setIssueStatus(req.params.id, req.body.status);
  if (!issue) throw ApiError.notFound('SEO finding not found.');

  await recordAudit(req, {
    action: 'seo.issue.update',
    entityType: 'seo_issue',
    entityId: issue.id,
    summary: `Marked SEO finding "${issue.check_key}" as ${req.body.status}`,
  });

  res.json({ success: true, data: await getHealth() });
}

export default { seoHealth, runSeoAudit, updateSeoIssue };
