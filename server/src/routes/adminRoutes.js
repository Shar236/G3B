import { Router } from 'express';
import * as admin from '../controllers/adminContentController.js';
import * as enquiries from '../controllers/adminEnquiryController.js';
import * as users from '../controllers/adminUserController.js';
import * as seo from '../controllers/adminSeoController.js';
import * as media from '../controllers/adminMediaController.js';
import * as redirects from '../controllers/adminRedirectController.js';
import * as seoAudit from '../controllers/adminSeoAuditController.js';
import * as audit from '../controllers/adminAuditController.js';
import * as integrations from '../controllers/adminIntegrationController.js';
import { requireAuth, requireRole, csrfProtection } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { contentRules, contentBlockRules, reorderRules, settingsRules } from '../validators/contentValidators.js';
import { createUserRules, updateUserRules, userParamRule } from '../validators/authValidators.js';
import { updateEnquiryRules, noteRules, noteParamRules, idParamRule } from '../validators/enquiryValidators.js';
import {
  pageRules,
  seoRules,
  sectionRules,
  sectionReorderRules,
  seoIssueRules,
} from '../validators/seoValidators.js';
import { mediaUpdateRules, mediaRenameRules } from '../validators/mediaValidators.js';
import { createRedirectRules, updateRedirectRules } from '../validators/redirectValidators.js';
import { uploadImage } from '../middleware/upload.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Every admin route requires an authenticated administrator and a valid CSRF
// token for state-changing requests.
router.use(requireAuth, requireRole('admin'), csrfProtection);

// --- Enquiries --------------------------------------------------------------
router.get('/enquiries', asyncHandler(enquiries.listEnquiries));
router.get('/enquiries/stats', asyncHandler(enquiries.enquiryStats));
router.get(['/enquiries/export', '/enquiries/export.csv'], asyncHandler(enquiries.exportEnquiries));
router.get('/enquiries/:id', idParamRule, validate, asyncHandler(enquiries.getEnquiry));
router.patch('/enquiries/:id', updateEnquiryRules, validate, asyncHandler(enquiries.updateEnquiry));
router.delete('/enquiries/:id', idParamRule, validate, asyncHandler(enquiries.deleteEnquiry));
router.post('/enquiries/:id/anonymize', idParamRule, validate, asyncHandler(enquiries.anonymizeEnquiry));

// Internal notes are admin-only; no public endpoint ever returns them.
router.get('/enquiries/:id/notes', idParamRule, validate, asyncHandler(enquiries.listEnquiryNotes));
router.post('/enquiries/:id/notes', noteRules, validate, asyncHandler(enquiries.addEnquiryNote));
router.delete('/enquiries/:id/notes/:noteId', noteParamRules, validate, asyncHandler(enquiries.deleteEnquiryNote));

// --- Users ------------------------------------------------------------------
router.get('/users', asyncHandler(users.listUsers));
router.post('/users', createUserRules, validate, asyncHandler(users.createUser));
router.patch('/users/:id', updateUserRules, validate, asyncHandler(users.updateUser));
router.delete('/users/:id', userParamRule, validate, asyncHandler(users.deleteUser));

// --- Site settings & content blocks ----------------------------------------
router.patch('/site-settings', settingsRules, validate, asyncHandler(admin.updateSiteSettings));
router.delete('/site-settings/:key', asyncHandler(admin.deleteSiteSetting));
router.patch('/content-blocks/:key', contentBlockRules, validate, asyncHandler(admin.updateContentBlock));

// --- Media upload & notification queue -------------------------------------
router.post('/uploads', uploadImage, asyncHandler(admin.uploadImageFile));
router.post('/notifications/retry', asyncHandler(admin.retryNotifications));

// --- Image optimisation manager --------------------------------------------
// `/media/stats` and `/media/unused` are declared before `/media/:id` so they
// are never captured as an id.
router.get('/media/stats', asyncHandler(media.mediaStats));
router.get('/media/unused', asyncHandler(media.listUnusedMedia));
router.get('/media', asyncHandler(media.listMedia));
router.post('/media', uploadImage, asyncHandler(media.uploadMedia));
router.get('/media/:id', idParamRule, validate, asyncHandler(media.getMedia));
router.get('/media/:id/usages', idParamRule, validate, asyncHandler(media.mediaUsages));
router.patch('/media/:id', mediaUpdateRules, validate, asyncHandler(media.updateMedia));
router.post('/media/:id/rename', mediaRenameRules, validate, asyncHandler(media.renameMedia));
router.post('/media/:id/optimize', idParamRule, validate, asyncHandler(media.reoptimizeMedia));
router.delete('/media/:id', idParamRule, validate, asyncHandler(media.deleteMedia));

// --- Redirect manager -------------------------------------------------------
router.get('/redirects', asyncHandler(redirects.listRedirects));
router.post('/redirects', createRedirectRules, validate, asyncHandler(redirects.createRedirect));
router.get('/redirects/:id', idParamRule, validate, asyncHandler(redirects.getRedirect));
router.patch('/redirects/:id', updateRedirectRules, validate, asyncHandler(redirects.updateRedirect));
router.delete('/redirects/:id', idParamRule, validate, asyncHandler(redirects.deleteRedirect));

// --- Pages & SEO Manager ----------------------------------------------------
// Declared before the generic `/:resource` routes so `/pages` is never captured
// as a content resource slug.
router.get('/pages', asyncHandler(seo.listPages));
router.post('/pages', pageRules.create, validate, asyncHandler(seo.createPage));
router.get('/pages/:id', idParamRule, validate, asyncHandler(seo.getPage));
router.patch('/pages/:id', pageRules.update, validate, asyncHandler(seo.updatePage));
router.delete('/pages/:id', idParamRule, validate, asyncHandler(seo.deletePage));

router.put('/pages/:id/seo', seoRules, validate, asyncHandler(seo.savePageSeo));
router.post('/pages/:id/seo/publish', idParamRule, validate, asyncHandler(seo.publishPageSeo));

router.get('/pages/:id/sections', idParamRule, validate, asyncHandler(seo.listPageSections));
router.patch(
  '/pages/:id/sections/reorder',
  idParamRule,
  sectionReorderRules,
  validate,
  asyncHandler(seo.reorderPageSections),
);
router.put(
  '/pages/:id/sections/:sectionKey',
  idParamRule,
  sectionRules,
  validate,
  asyncHandler(seo.upsertPageSection),
);
router.delete(
  '/pages/:id/sections/:sectionKey',
  idParamRule,
  validate,
  asyncHandler(seo.deletePageSection),
);

router.get('/pages/:id/revisions', idParamRule, validate, asyncHandler(seo.listPageRevisions));
router.post(
  '/pages/:id/revisions/:revisionId/rollback',
  asyncHandler(seo.rollbackPageRevision),
);

// --- SEO health dashboard ---------------------------------------------------
router.get('/seo/health', asyncHandler(seoAudit.seoHealth));
router.post('/seo/audit', asyncHandler(seoAudit.runSeoAudit));
router.patch('/seo/issues/:id', seoIssueRules, validate, asyncHandler(seoAudit.updateSeoIssue));

// --- Third-party integrations (GSC / GA4 / PageSpeed) -----------------------
router.get('/integrations', asyncHandler(integrations.listIntegrationSettings));
router.patch('/integrations/:provider', asyncHandler(integrations.updateIntegrationSettings));
router.post('/integrations/:provider/check', asyncHandler(integrations.checkIntegrationConnection));

// --- Audit trail (read-only) ------------------------------------------------
router.get('/audit-logs/actions', asyncHandler(audit.listAuditActions));
router.get('/audit-logs', asyncHandler(audit.listAuditLogs));

// --- Generic content resources ---------------------------------------------
// URL slug -> validator key (camelCase) mapping.
const RULES_KEY = {
  services: 'services',
  destinations: 'destinations',
  gallery: 'gallery',
  testimonials: 'testimonials',
  videos: 'videos',
  'process-steps': 'processSteps',
  stats: 'stats',
  'why-features': 'whyFeatures',
  certifications: 'certifications',
  'enquiry-options': 'enquiryOptions',
  'social-links': 'socialLinks',
  navigation: 'navigation',
  faqs: 'faqs',
};

/** Run an array of express-validator chains, then the shared `validate`. */
function runValidators(chains) {
  return (req, res, next) => {
    let index = 0;
    const step = (error) => {
      if (error) return next(error);
      if (index >= chains.length) return validate(req, res, next);
      const middleware = chains[index];
      index += 1;
      return middleware(req, res, step);
    };
    return step();
  };
}

const ensureResource = (req, _res, next) => {
  if (!admin.resources[req.params.resource]) {
    return next(ApiError.notFound(`Unknown content resource "${req.params.resource}".`));
  }
  return next();
};

const resourceRules = (mode) => (req, res, next) => {
  const key = RULES_KEY[req.params.resource];
  const chains = key ? contentRules[key]?.[mode] : null;
  if (!chains) return next(ApiError.badRequest('No validation rules registered for this resource.'));
  return runValidators(chains)(req, res, next);
};

// `reorder` must be declared before `/:id` so it is not captured as an id.
router.patch('/:resource/reorder', ensureResource, reorderRules, validate, asyncHandler(admin.reorderResource));
router.get('/:resource', ensureResource, asyncHandler(admin.listResource));
router.post('/:resource', ensureResource, resourceRules('create'), asyncHandler(admin.createResource));
router.patch('/:resource/:id', ensureResource, resourceRules('update'), asyncHandler(admin.updateResource));
router.delete('/:resource/:id', ensureResource, idParamRule, validate, asyncHandler(admin.deleteResource));

export default router;
