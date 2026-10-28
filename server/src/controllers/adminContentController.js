import {
  servicesRepository,
  destinationsRepository,
  galleryRepository,
  testimonialsRepository,
  videosRepository,
  processStepsRepository,
  statsRepository,
  whyFeaturesRepository,
  certificationsRepository,
  enquiryOptionsRepository,
  socialLinksRepository,
  navigationItemsRepository,
  footerLinksRepository,
  faqsRepository,
  assessmentListingsRepository,
  universitiesRepository,
  programsRepository,
} from '../repositories/catalogRepository.js';
import { contentBlocksRepository, settingsRepository } from '../repositories/settingsRepository.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { retryPendingNotifications } from '../services/notificationService.js';
import { parseVideoUrl } from '../utils/contentUrls.js';
import { downloadObject, publicObjectUrl, storageBuckets } from '../services/supabaseStorage.js';

/**
 * Resource registry powering the admin CRUD endpoints. Each entry maps a URL
 * slug to a repository. `reorderable` marks resources backed by the generic
 * helper (which exposes reorder support).
 */
export const resources = {
  services: { repo: servicesRepository, reorderable: true },
  destinations: { repo: destinationsRepository, reorderable: true },
  gallery: { repo: galleryRepository, reorderable: true },
  testimonials: { repo: testimonialsRepository, reorderable: true },
  videos: { repo: videosRepository, reorderable: true },
  'process-steps': { repo: processStepsRepository, reorderable: true },
  stats: { repo: statsRepository, reorderable: true },
  'why-features': { repo: whyFeaturesRepository, reorderable: true },
  certifications: { repo: certificationsRepository, reorderable: true },
  'enquiry-options': { repo: enquiryOptionsRepository, reorderable: true },
  'social-links': { repo: socialLinksRepository, reorderable: true },
  navigation: { repo: navigationItemsRepository, reorderable: true },
  'footer-links': { repo: footerLinksRepository, reorderable: true },
  faqs: { repo: faqsRepository, reorderable: true },
  assessments: { repo: assessmentListingsRepository, reorderable: true },
  universities: { repo: universitiesRepository, reorderable: true },
  programs: { repo: programsRepository, reorderable: true },
};

function getResource(name) {
  const resource = resources[name];
  if (!resource) throw ApiError.notFound(`Unknown content resource "${name}".`);
  return resource;
}

/** GET /api/admin/<resource> */
export async function listResource(req, res) {
  const { repo } = getResource(req.params.resource);
  res.json({ success: true, data: await repo.list({ activeOnly: false }) });
}

/** POST /api/admin/<resource> */
export async function createResource(req, res) {
  const { repo } = getResource(req.params.resource);
  if (req.params.resource === 'videos' && parseVideoUrl(req.body.youtubeUrl)?.provider === 'youtube') throw ApiError.badRequest('Add YouTube videos through the Shorts registry so channel membership can be verified.');
  const created = await repo.create(req.body);
  res.status(201).json({ success: true, data: created });
}

/** PATCH /api/admin/<resource>/:id */
export async function updateResource(req, res) {
  const { repo } = getResource(req.params.resource);
  const existing = await repo.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Resource not found.');
  if (req.params.resource === 'videos') {
    const video = parseVideoUrl(req.body.youtubeUrl ?? existing.youtubeUrl);
    if (!video || video.id !== (req.body.youtubeId ?? existing.youtubeId)) throw ApiError.badRequest('The video URL and video ID must match a supported YouTube or Vimeo video.');
  }
  const updated = await repo.update(req.params.id, req.body);
  res.json({ success: true, data: updated });
}

/** DELETE /api/admin/<resource>/:id */
export async function deleteResource(req, res) {
  const { repo } = getResource(req.params.resource);
  const removed = await repo.remove(req.params.id);
  if (!removed) throw ApiError.notFound('Resource not found.');
  res.json({ success: true, data: { message: 'Deleted.' } });
}

/** PATCH /api/admin/<resource>/reorder */
export async function reorderResource(req, res) {
  const { repo, reorderable } = getResource(req.params.resource);
  if (!reorderable) throw ApiError.badRequest('This resource does not support drag reordering.');
  res.json({ success: true, data: await repo.reorder(req.body.ids) });
}

/** PATCH /api/admin/content-blocks/:key */
export async function updateContentBlock(req, res) {
  const { key } = req.params;
  const updated = await contentBlocksRepository.upsert(key, req.body);
  if (!updated) throw ApiError.notFound('Content block not found.');
  res.json({
    success: true,
    data: {
      key: updated.block_key,
      heading: updated.heading,
      subheading: updated.subheading,
      body: updated.body,
      ctaLabel: updated.cta_label,
      ctaUrl: updated.cta_url,
    },
  });
}

/** PATCH /api/admin/site-settings */
export async function getSiteSettings(_req, res) {
  res.json({ success: true, data: await settingsRepository.all() });
}

export async function updateSiteSettings(req, res) {
  const updated = await settingsRepository.upsertMany(req.body);
  res.json({ success: true, data: updated });
}

/** DELETE /api/admin/site-settings/:key */
export async function deleteSiteSetting(req, res) {
  const removed = await settingsRepository.remove(req.params.key);
  if (!removed) throw ApiError.notFound('Setting not found.');
  res.json({ success: true, data: { message: 'Setting removed.' } });
}

/** POST /api/admin/uploads - multipart image upload (single file, field "image") */
export async function uploadImageFile(req, res) {
  if (typeof req.body?.storageKey === 'string') {
    const storageKey = req.body.storageKey;
    if (!storageKey.startsWith('content/')) throw ApiError.badRequest('The uploaded image reference is invalid.');
    const { buffer, contentType } = await downloadObject(storageBuckets.media, storageKey, {
      maxBytes: env.uploads.maxBytes,
    });
    if (!contentType.startsWith('image/')) throw ApiError.badRequest('The uploaded file is not an image.');
    const url = publicObjectUrl(storageBuckets.media, storageKey);
    res.status(201).json({
      success: true,
      data: {
        filename: storageKey.split('/').pop(),
        size: buffer.length,
        mimetype: contentType,
        url,
        relativeUrl: url,
      },
    });
    return;
  }

  if (!req.file) throw ApiError.badRequest('No image file was uploaded.');

  const relativeUrl = `/${env.uploads.dir}/${req.file.filename}`;
  const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

  res.status(201).json({
    success: true,
    data: {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: absoluteUrl,
      relativeUrl,
    },
  });
}

/** POST /api/admin/notifications/retry - flush the email retry queue */
export async function retryNotifications(_req, res) {
  const result = await retryPendingNotifications(50);
  res.json({ success: true, data: result });
}

export default {
  resources,
  listResource,
  createResource,
  updateResource,
  deleteResource,
  reorderResource,
  updateContentBlock,
  updateSiteSettings,
  deleteSiteSetting,
  uploadImageFile,
  retryNotifications,
};
