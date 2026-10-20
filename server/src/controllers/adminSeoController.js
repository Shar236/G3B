import { pagesRepository } from '../repositories/pagesRepository.js';
import ApiError from '../utils/ApiError.js';
import { recordAudit } from '../services/auditLog.js';

/** Shared route-uniqueness guard for create/update. */
async function assertRouteAvailable(route, excludeId = null) {
  const owner = await pagesRepository.findRouteOwner(route, excludeId);
  if (owner) {
    throw ApiError.conflict(
      `The route "${route}" is already used by "${owner.name}". Choose a different route.`,
      { route: 'This route is already assigned to another page.' },
    );
  }
}

/** GET /api/admin/pages */
export async function listPages(req, res) {
  const status = ['draft', 'published'].includes(req.query.status) ? req.query.status : null;
  res.json({ success: true, data: await pagesRepository.list({ status }) });
}

/** GET /api/admin/pages/:id */
export async function getPage(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');
  res.json({ success: true, data: page });
}

/** POST /api/admin/pages */
export async function createPage(req, res) {
  await assertRouteAvailable(req.body.route);
  const page = await pagesRepository.create(req.body, req.user.id);
  await recordAudit(req, {
    action: 'page.create',
    entityType: 'page',
    entityId: page.id,
    summary: `Created page "${page.name}" (${page.route})`,
    changes: { route: page.route, status: page.status },
  });
  res.status(201).json({ success: true, data: page });
}

/** PATCH /api/admin/pages/:id */
export async function updatePage(req, res) {
  const existing = await pagesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Page not found.');

  if (req.body.route && req.body.route !== existing.route) {
    await assertRouteAvailable(req.body.route, existing.id);
  }

  const page = await pagesRepository.update(existing.id, req.body, req.user.id);
  await recordAudit(req, {
    action: 'page.update',
    entityType: 'page',
    entityId: page.id,
    summary: `Updated page "${page.name}" (${page.route})`,
    changes: req.body,
  });
  res.json({ success: true, data: page });
}

/** DELETE /api/admin/pages/:id */
export async function deletePage(req, res) {
  const existing = await pagesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Page not found.');
  if (existing.isSystem) {
    throw ApiError.badRequest('System pages cannot be deleted. Unpublish them instead.');
  }

  await pagesRepository.remove(existing.id);
  await recordAudit(req, {
    action: 'page.delete',
    entityType: 'page',
    entityId: existing.id,
    summary: `Deleted page "${existing.name}" (${existing.route})`,
  });
  res.json({ success: true, data: { message: 'Page deleted.' } });
}

/**
 * PUT /api/admin/pages/:id/seo
 * Saves SEO metadata as a draft, or publishes it immediately when
 * `publish: true` is supplied. Only published metadata is rendered publicly.
 */
export async function savePageSeo(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const publish = req.body.publish === true;
  const seo = await pagesRepository.saveSeo(page.id, req.body, {
    mode: publish ? 'publish' : 'draft',
    userId: req.user.id,
  });

  await recordAudit(req, {
    action: publish ? 'page.seo.publish' : 'page.seo.draft',
    entityType: 'page',
    entityId: page.id,
    summary: `${publish ? 'Published' : 'Drafted'} SEO metadata for ${page.route}`,
    changes: req.body,
  });

  res.json({ success: true, data: seo });
}

/** POST /api/admin/pages/:id/seo/publish - promote the pending draft. */
export async function publishPageSeo(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const seo = await pagesRepository.publishSeo(page.id, req.user.id);
  if (!seo) throw ApiError.notFound('No SEO metadata exists for this page.');

  await recordAudit(req, {
    action: 'page.seo.publish',
    entityType: 'page',
    entityId: page.id,
    summary: `Published pending SEO draft for ${page.route}`,
  });

  res.json({ success: true, data: seo });
}

/** GET /api/admin/pages/:id/sections */
export async function listPageSections(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');
  res.json({ success: true, data: await pagesRepository.listSections(page.id) });
}

/** PUT /api/admin/pages/:id/sections/:sectionKey */
export async function upsertPageSection(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const section = await pagesRepository.upsertSection(
    page.id,
    req.params.sectionKey,
    req.body,
    req.user.id,
  );

  await recordAudit(req, {
    action: 'page.section.save',
    entityType: 'page',
    entityId: page.id,
    summary: `Saved section "${req.params.sectionKey}" on ${page.route}`,
    changes: req.body,
  });

  res.json({ success: true, data: section });
}

/** DELETE /api/admin/pages/:id/sections/:sectionKey */
export async function deletePageSection(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const removed = await pagesRepository.removeSection(page.id, req.params.sectionKey);
  if (!removed) throw ApiError.notFound('Section not found.');

  await recordAudit(req, {
    action: 'page.section.delete',
    entityType: 'page',
    entityId: page.id,
    summary: `Deleted section "${req.params.sectionKey}" from ${page.route}`,
  });

  res.json({ success: true, data: { message: 'Section deleted.' } });
}

/** PATCH /api/admin/pages/:id/sections/reorder */
export async function reorderPageSections(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const sections = await pagesRepository.reorderSections(page.id, req.body.keys);
  await recordAudit(req, {
    action: 'page.section.reorder',
    entityType: 'page',
    entityId: page.id,
    summary: `Reordered sections on ${page.route}`,
    changes: { keys: req.body.keys },
  });

  res.json({ success: true, data: sections });
}

/** GET /api/admin/pages/:id/revisions */
export async function listPageRevisions(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');
  res.json({ success: true, data: await pagesRepository.listRevisions(page.id) });
}

/** POST /api/admin/pages/:id/revisions/:revisionId/rollback */
export async function rollbackPageRevision(req, res) {
  const page = await pagesRepository.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found.');

  const restored = await pagesRepository.rollback(page.id, req.params.revisionId, req.user.id);
  if (!restored) throw ApiError.notFound('Revision not found.');

  await recordAudit(req, {
    action: 'page.revision.rollback',
    entityType: 'page',
    entityId: page.id,
    summary: `Rolled ${page.route} back to revision #${req.params.revisionId}`,
  });

  res.json({ success: true, data: restored });
}

export default {
  listPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  savePageSeo,
  publishPageSeo,
  listPageSections,
  upsertPageSection,
  deletePageSection,
  reorderPageSections,
  listPageRevisions,
  rollbackPageRevision,
};
