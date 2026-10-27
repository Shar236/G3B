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
import * as subscribers from '../controllers/subscriberController.js';
import * as youtube from '../controllers/adminYouTubeController.js';
import * as partner from '../controllers/partnerController.js';
import { partnerListRules, updatePartnerEnquiryRules } from '../validators/partnerValidators.js';
import { registerYouTubeRules, updateYouTubeRules } from '../validators/youtubeValidators.js';
import { requireAuth, requireRole, csrfProtection } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { contentRules, contentBlockRules, reorderRules, settingsRules } from '../validators/contentValidators.js';
import { createUserRules, updateUserRules, userParamRule } from '../validators/authValidators.js';
import { createEnquiryRules, updateEnquiryRules, enquiryListRules, enquiryBulkRules, noteRules, noteParamRules, idParamRule } from '../validators/enquiryValidators.js';
import { createSubscriberRules, updateSubscriberRules, subscriberListRules, subscriberBulkRules } from '../validators/subscriberValidators.js';
import {
  pageRules,
  seoRules,
  sectionRules,
  sectionReorderRules,
  seoIssueRules,
} from '../validators/seoValidators.js';
import { mediaUpdateRules, mediaRenameRules } from '../validators/mediaValidators.js';
import { createRedirectRules, updateRedirectRules } from '../validators/redirectValidators.js';
import { uploadImage, uploadMediaFile, uploadMultiplePhotos, uploadAssessmentReport, uploadLearningPdf } from '../middleware/upload.js';
import * as mediaGalleryAdmin from '../controllers/adminMediaGalleryController.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as assessments from '../controllers/assessmentController.js';
import * as learning from '../controllers/learningController.js';
import { body, param } from 'express-validator';

const router = Router();

// Every admin route requires an authenticated administrator and a valid CSRF
// token for state-changing requests.
router.use(requireAuth, csrfProtection);

const leadRole = requireRole('admin', 'staff', 'counsellor');
const adminRole = requireRole('admin');
router.use('/enquiries', leadRole);
router.use('/subscribers', leadRole);
router.use('/partner-enquiries', leadRole);
router.use('/assessment-assignments', leadRole);
router.use('/learning', leadRole);

// --- Enquiries --------------------------------------------------------------
router.get('/enquiries', enquiryListRules, validate, asyncHandler(enquiries.listEnquiries));
router.post('/enquiries', createEnquiryRules, validate, asyncHandler(enquiries.createAdminEnquiry));
router.post('/enquiries/bulk', enquiryBulkRules, validate, asyncHandler(enquiries.bulkEnquiries));
router.get('/enquiries/stats', asyncHandler(enquiries.enquiryStats));
router.get(['/enquiries/export', '/enquiries/export.csv'], enquiryListRules, validate, asyncHandler(enquiries.exportEnquiries));
router.get('/enquiries/:id', idParamRule, validate, asyncHandler(enquiries.getEnquiry));
router.patch('/enquiries/:id', updateEnquiryRules, validate, asyncHandler(enquiries.updateEnquiry));
router.delete('/enquiries/:id', adminRole, idParamRule, validate, asyncHandler(enquiries.deleteEnquiry));
router.post('/enquiries/:id/anonymize', adminRole, idParamRule, validate, asyncHandler(enquiries.anonymizeEnquiry));

// Internal notes are admin-only; no public endpoint ever returns them.
router.get('/enquiries/:id/notes', idParamRule, validate, asyncHandler(enquiries.listEnquiryNotes));
router.post('/enquiries/:id/notes', idParamRule, noteRules, validate, asyncHandler(enquiries.addEnquiryNote));
router.delete('/enquiries/:id/notes/:noteId', adminRole, noteParamRules, validate, asyncHandler(enquiries.deleteEnquiryNote));

// --- Partner Enquiries ------------------------------------------------------
router.get('/partner-enquiries', partnerListRules, validate, asyncHandler(partner.listPartnerEnquiries));
router.get('/partner-enquiries/stats', asyncHandler(partner.partnerStats));
router.get(['/partner-enquiries/export', '/partner-enquiries/export.csv'], partnerListRules, validate, asyncHandler(partner.exportPartnerEnquiries));
router.get('/partner-enquiries/:id', idParamRule, validate, asyncHandler(partner.getPartnerEnquiry));
router.patch('/partner-enquiries/:id', updatePartnerEnquiryRules, validate, asyncHandler(partner.updatePartnerEnquiry));
router.delete('/partner-enquiries/:id', adminRole, idParamRule, validate, asyncHandler(partner.deletePartnerEnquiry));

router.get('/assessment-assignments', asyncHandler(assessments.listAssignments));
router.patch('/assessment-assignments/:id', [param('id').isInt({ min: 1 }).toInt(), body('status').optional().isIn(['not_started','in_progress','completed']), body('progressPercent').optional().isInt({ min: 0, max: 100 }).toInt(), body('recommendation').optional({ values: 'null' }).trim().isLength({ max: 5000 })], validate, asyncHandler(assessments.updateAssignment));
router.post('/assessment-assignments/:id/report', [param('id').isInt({ min: 1 }).toInt()], validate, uploadAssessmentReport, asyncHandler(assessments.uploadReport));

const learningId = [param('id').isInt({ min: 1 }).toInt()];
const learningFields = [
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('instructions').optional().trim().isLength({ max: 20000 }),
  body('category').optional().trim().isLength({ min: 2, max: 80 }),
  body('dueAt').optional({ values: 'falsy' }).isISO8601(),
  body('status').isIn(['draft', 'published', 'archived']),
];
router.get('/learning/students', asyncHandler(learning.listStudents));
router.get('/learning/notifications', asyncHandler(learning.notificationStatus));
router.post('/learning/notifications/retry', asyncHandler(learning.retryNotifications));
router.get('/learning/assignments', asyncHandler(learning.listAssignments));
router.post('/learning/assignments', learningFields, validate, asyncHandler(learning.createAssignment));
router.get('/learning/assignments/:id', learningId, validate, asyncHandler(learning.getAssignment));
router.patch('/learning/assignments/:id', [...learningId, ...learningFields], validate, asyncHandler(learning.updateAssignment));
router.delete('/learning/assignments/:id', adminRole, learningId, validate, asyncHandler(learning.deleteAssignment));
router.post('/learning/assignments/:id/targets', [
  ...learningId, body('studentIds').isArray({ min: 1, max: 1000 }),
  body('studentIds.*').isInt({ min: 1 }).toInt(),
], validate, asyncHandler(learning.assignStudents));
router.post('/learning/assignments/:id/files', learningId, validate, uploadLearningPdf, asyncHandler(learning.addAssignmentFile));
router.get('/learning/assignments/:id/files/:fileId', [...learningId, param('fileId').isInt({ min: 1 }).toInt()], validate, asyncHandler(learning.downloadAdminFile));
router.delete('/learning/assignments/:id/files/:fileId', [...learningId, param('fileId').isInt({ min: 1 }).toInt()], validate, asyncHandler(learning.deleteAssignmentFile));
router.get('/learning/submissions/:submissionId/file', [param('submissionId').isInt({ min: 1 }).toInt()], validate, asyncHandler(learning.downloadSubmission));
router.patch('/learning/submissions/:submissionId', [
  param('submissionId').isInt({ min: 1 }).toInt(),
  body('feedback').optional().trim().isLength({ max: 10000 }),
  body('marks').optional().trim().isLength({ max: 40 }),
], validate, asyncHandler(learning.reviewSubmission));
router.get('/learning/announcements', asyncHandler(learning.listAnnouncements));
router.post('/learning/announcements', [
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('body').trim().isLength({ min: 2, max: 10000 }),
  body('status').isIn(['draft', 'published', 'archived']),
], validate, asyncHandler(learning.createAnnouncement));
router.patch('/learning/announcements/:id', [
  param('id').isInt({ min: 1 }).toInt(),
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('body').trim().isLength({ min: 2, max: 10000 }),
  body('status').isIn(['draft', 'published', 'archived']),
], validate, asyncHandler(learning.updateAnnouncement));

router.get('/subscribers', subscriberListRules, validate, asyncHandler(subscribers.listSubscribers));
router.get(['/subscribers/export', '/subscribers/export.csv'], subscriberListRules, validate, asyncHandler(subscribers.exportSubscribers));
router.post('/subscribers', createSubscriberRules, validate, asyncHandler(subscribers.createSubscriber));
router.post('/subscribers/bulk', subscriberBulkRules, validate, asyncHandler(subscribers.bulkSubscribers));
router.patch('/subscribers/:id', updateSubscriberRules, validate, asyncHandler(subscribers.updateSubscriber));
router.delete('/subscribers/:id', adminRole, idParamRule, validate, asyncHandler(subscribers.deleteSubscriber));

// All remaining resources are content or sensitive system administration.
router.use(requireRole('admin', 'editor'));
for (const path of ['/users', '/site-settings', '/notifications', '/integrations', '/audit-logs']) router.use(path, adminRole);

// Official YouTube metadata cache and reviewed Shorts registry.
router.get('/youtube-shorts/status', asyncHandler(youtube.status));
router.post('/youtube-shorts/sync', asyncHandler(youtube.sync));
router.get('/youtube-shorts', asyncHandler(youtube.list));
router.post('/youtube-shorts', registerYouTubeRules, validate, asyncHandler(youtube.register));
router.post('/youtube-shorts/manual', registerYouTubeRules, validate, asyncHandler(youtube.saveManual));
router.patch('/youtube-shorts/:id', updateYouTubeRules, validate, asyncHandler(youtube.update));
router.delete('/youtube-shorts/:id', idParamRule, validate, asyncHandler(youtube.remove));

// --- Users ------------------------------------------------------------------
router.get('/users', asyncHandler(users.listUsers));
router.post('/users', createUserRules, validate, asyncHandler(users.createUser));
router.patch('/users/:id', updateUserRules, validate, asyncHandler(users.updateUser));
router.delete('/users/:id', userParamRule, validate, asyncHandler(users.deleteUser));

// --- Site settings & content blocks ----------------------------------------
router.get('/site-settings', asyncHandler(admin.getSiteSettings));
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

// --- Media Gallery Manager (Photos & Videos) --------------------------------
router.get('/media-gallery/stats', asyncHandler(mediaGalleryAdmin.getStats));
router.get('/media-gallery', asyncHandler(mediaGalleryAdmin.listMedia));
router.post('/media-gallery', uploadMediaFile, asyncHandler(mediaGalleryAdmin.createMedia));
router.post('/media-gallery/bulk-photos', uploadMultiplePhotos, asyncHandler(mediaGalleryAdmin.bulkUploadPhotos));
router.patch('/media-gallery/reorder', asyncHandler(mediaGalleryAdmin.reorderMedia));
router.get('/media-gallery/:id', idParamRule, validate, asyncHandler(mediaGalleryAdmin.getMedia));
router.patch('/media-gallery/:id', idParamRule, validate, asyncHandler(mediaGalleryAdmin.updateMedia));
router.delete('/media-gallery/:id', idParamRule, validate, asyncHandler(mediaGalleryAdmin.deleteMedia));

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
router.get('/pages/catalog', asyncHandler(seo.listPageCatalog));
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
  'footer-links': 'footerLinks',
  faqs: 'faqs',
  assessments: 'assessments',
  universities: 'universities',
  programs: 'programs',
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
