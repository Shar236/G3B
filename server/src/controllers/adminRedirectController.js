import { redirectsRepository } from '../repositories/redirectsRepository.js';
import { recordAudit } from '../services/auditLog.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const MAX_CHAIN_HOPS = 10;
const STATUS_CODES = [301, 302, 307, 308];

/** Origins that an absolute destination is allowed to point at. */
function allowedOrigins() {
  const configured = [process.env.PUBLIC_SITE_URL, process.env.SITE_URL]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return [...new Set([...configured, ...env.clientOrigins])];
}

/**
 * Reject destinations that could turn the redirect endpoint into an open
 * redirect, and reject header-injection characters.
 */
function assertSafeDestination(destinationPath) {
  if (/[\r\n]/.test(destinationPath)) {
    throw ApiError.badRequest('The destination contains invalid characters.', {
      destinationPath: 'Line breaks are not allowed.',
    });
  }

  if (destinationPath.startsWith('/')) {
    if (destinationPath.startsWith('//')) {
      throw ApiError.badRequest('Protocol-relative destinations are not allowed.', {
        destinationPath: 'Use a path like "/services" or a full URL on this site.',
      });
    }
    return;
  }

  let parsed;
  try {
    parsed = new URL(destinationPath);
  } catch {
    throw ApiError.badRequest('The destination must be a path beginning with "/" or an absolute URL.', {
      destinationPath: 'Enter a path such as "/services" or a full https:// URL on this site.',
    });
  }

  if (!allowedOrigins().includes(parsed.origin)) {
    throw ApiError.badRequest('Redirects may only point to this website.', {
      destinationPath: `Redirecting to ${parsed.origin} is not permitted.`,
    });
  }
}

/**
 * Walk the redirect graph from `startPath` and return the chain of source paths
 * encountered, stopping when a loop is detected.
 */
async function followChain(startPath) {
  const chain = [startPath];
  const seen = new Set([startPath]);
  let current = startPath;

  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop += 1) {
    // eslint-disable-next-line no-await-in-loop -- sequential graph walk
    const next = await redirectsRepository.findBySourcePath(current);
    if (!next || !next.isActive) break;
    if (seen.has(next.destinationPath)) {
      return { chain, loop: true, target: next.destinationPath };
    }
    seen.add(next.destinationPath);
    chain.push(next.destinationPath);
    current = next.destinationPath;
  }

  return { chain, loop: false, target: current };
}

/** Validate a redirect payload and detect loops/self-redirects. */
async function assertRedirectSafe({ sourcePath, destinationPath, excludeId = null }) {
  if (!sourcePath.startsWith('/')) {
    throw ApiError.badRequest('The source path must begin with "/".', {
      sourcePath: 'Source paths must begin with "/".',
    });
  }
  if (sourcePath === destinationPath) {
    throw ApiError.badRequest('A redirect cannot point at itself.', {
      destinationPath: 'Choose a different destination.',
    });
  }

  assertSafeDestination(destinationPath);

  const clash = await redirectsRepository.findBySourcePath(sourcePath, excludeId);
  if (clash) {
    throw ApiError.conflict(`A redirect for "${sourcePath}" already exists.`, {
      sourcePath: 'This source path is already redirected.',
    });
  }

  const { loop, target } = await followChain(destinationPath);
  if (loop || target === sourcePath) {
    throw ApiError.conflict('That redirect would create a loop.', {
      destinationPath: 'This destination leads back to the source, creating a redirect loop.',
    });
  }
}

/** GET /api/admin/redirects */
export async function listRedirects(req, res) {
  const rows = await redirectsRepository.list({
    search: req.query.search || undefined,
    activeOnly: req.query.activeOnly === 'true',
  });

  // Surface automated findings about the current rule set (chains, loops).
  const bySource = new Map(rows.map((row) => [row.sourcePath, row]));
  const issues = [];
  for (const row of rows) {
    if (!row.isActive) continue;
    const next = bySource.get(row.destinationPath);
    if (next && next.id !== row.id && next.isActive) {
      issues.push({
        checkKey: 'redirect.chain',
        severity: next.destinationPath === row.sourcePath ? 'critical' : 'warning',
        redirectId: row.id,
        message: `"${row.sourcePath}" redirects to "${row.destinationPath}", which is redirected again to "${next.destinationPath}".`,
        recommendation: 'Point the redirect straight at the final destination to avoid a chain.',
        isAutomated: true,
      });
    }
  }

  res.json({ success: true, data: rows, meta: { issues } });
}

/** GET /api/admin/redirects/:id */
export async function getRedirect(req, res) {
  const redirect = await redirectsRepository.findById(req.params.id);
  if (!redirect) throw ApiError.notFound('Redirect not found.');
  res.json({ success: true, data: redirect });
}

/** POST /api/admin/redirects */
export async function createRedirect(req, res) {
  const statusCode = req.body.statusCode ?? 301;
  if (!STATUS_CODES.includes(statusCode)) {
    throw ApiError.badRequest('Unsupported status code.', {
      statusCode: `Use one of ${STATUS_CODES.join(', ')}.`,
    });
  }

  await assertRedirectSafe({
    sourcePath: req.body.sourcePath,
    destinationPath: req.body.destinationPath,
  });

  const redirect = await redirectsRepository.create({ ...req.body, statusCode });
  await recordAudit(req, {
    action: 'redirect.create',
    entityType: 'redirect',
    entityId: redirect.id,
    summary: `Added ${redirect.statusCode} redirect ${redirect.sourcePath} -> ${redirect.destinationPath}`,
  });
  res.status(201).json({ success: true, data: redirect });
}

/** PATCH /api/admin/redirects/:id */
export async function updateRedirect(req, res) {
  const existing = await redirectsRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Redirect not found.');

  if (req.body.statusCode !== undefined && !STATUS_CODES.includes(req.body.statusCode)) {
    throw ApiError.badRequest('Unsupported status code.', {
      statusCode: `Use one of ${STATUS_CODES.join(', ')}.`,
    });
  }

  const sourcePath = req.body.sourcePath ?? existing.sourcePath;
  const destinationPath = req.body.destinationPath ?? existing.destinationPath;

  if (req.body.sourcePath !== undefined || req.body.destinationPath !== undefined) {
    await assertRedirectSafe({ sourcePath, destinationPath, excludeId: existing.id });
  }

  const redirect = await redirectsRepository.update(existing.id, req.body);
  await recordAudit(req, {
    action: 'redirect.update',
    entityType: 'redirect',
    entityId: redirect.id,
    summary: `Updated redirect ${redirect.sourcePath}`,
    changes: req.body,
  });
  res.json({ success: true, data: redirect });
}

/** DELETE /api/admin/redirects/:id */
export async function deleteRedirect(req, res) {
  const existing = await redirectsRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Redirect not found.');

  await redirectsRepository.remove(existing.id);
  await recordAudit(req, {
    action: 'redirect.delete',
    entityType: 'redirect',
    entityId: existing.id,
    summary: `Deleted redirect ${existing.sourcePath}`,
  });
  res.json({ success: true, data: { message: 'Redirect deleted.' } });
}

export default { listRedirects, getRedirect, createRedirect, updateRedirect, deleteRedirect, STATUS_CODES };
