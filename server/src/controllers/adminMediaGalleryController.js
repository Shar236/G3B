import fs from 'node:fs/promises';
import path from 'node:path';
import mediaGalleryRepository from '../repositories/mediaGalleryRepository.js';
import { uploadsRoot } from '../middleware/upload.js';
import { parseVideoUrl } from '../utils/contentUrls.js';
import { generateVariants, readImageMetadata, OPTIMIZED_FOLDER } from '../services/imageOptimizer.js';
import { recordAudit } from '../services/auditLog.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { deleteObjects, publicObjectUrl, storageBuckets } from '../services/supabaseStorage.js';

const URL_BASE = `/${env.uploads.dir}`;
const OPTIMIZED_DIR = path.join(uploadsRoot, OPTIMIZED_FOLDER);
const OPTIMIZED_URL_BASE = `${URL_BASE}/${OPTIMIZED_FOLDER}`;

function extractYoutubeId(urlStr) {
  const parsed = parseVideoUrl(urlStr);
  return parsed?.provider === 'youtube' ? parsed.id : null;
}

function extractVimeoId(urlStr) {
  const parsed = parseVideoUrl(urlStr);
  return parsed?.provider === 'vimeo' ? parsed.id : null;
}

/**
 * GET /api/admin/media-gallery
 */
export async function listMedia(req, res) {
  const { type, category, status, search, page = 1, perPage = 30, sort = 'order' } = req.query;

  const result = await mediaGalleryRepository.list({
    type: type || 'all',
    category: category || undefined,
    status: status || 'all',
    search: search || undefined,
    page: Number(page) || 1,
    perPage: Math.min(Number(perPage) || 30, 100),
    sort,
  });

  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}

/**
 * GET /api/admin/media-gallery/stats
 */
export async function getStats(_req, res) {
  const stats = await mediaGalleryRepository.getStats();

  // Compute local uploads disk storage usage
  let storageBytes = 0;
  let fileCount = 0;
  try {
    const files = await fs.readdir(uploadsRoot);
    for (const file of files) {
      try {
        const stat = await fs.stat(path.join(uploadsRoot, file));
        if (stat.isFile()) {
          storageBytes += stat.size;
          fileCount += 1;
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch (err) {
    logger.warn('Could not read uploads folder size', { error: err.message });
  }

  res.json({
    success: true,
    data: {
      ...stats,
      storage: {
        provider: env.uploads.provider || 'local',
        totalBytes: storageBytes,
        totalFiles: fileCount,
        maxBytes: env.uploads.maxBytes * 100, // capacity reference
      },
    },
  });
}

/**
 * GET /api/admin/media-gallery/:id
 */
export async function getMedia(req, res) {
  const item = await mediaGalleryRepository.getById(req.params.id);
  if (!item) throw ApiError.notFound('Media item not found.');
  res.json({ success: true, data: item });
}

/**
 * POST /api/admin/media-gallery
 * Create a photo or video item. Accepts multipart file upload OR json payload.
 */
export async function createMedia(req, res) {
  const body = req.body || {};
  let mediaType = body.mediaType || body.media_type || 'photo';
  let mediaUrl = body.mediaUrl || body.media_url || '';
  let thumbnailUrl = body.thumbnailUrl || body.thumbnail_url || null;
  let externalVideoUrl = body.externalVideoUrl || body.external_video_url || null;
  let storageProvider = body.storageProvider || body.storage_provider || 'local';
  let storageKey = body.storageKey || null;

  if (req.file) {
    const { filename, originalname, mimetype, path: filePath } = req.file;
    storageKey = filename;
    storageProvider = 'local';
    mediaUrl = `${URL_BASE}/${filename}`;

    if (mimetype.startsWith('video/')) {
      mediaType = 'video';
      thumbnailUrl = body.thumbnailUrl || body.thumbnail_url || null;
    } else {
      mediaType = 'photo';
      thumbnailUrl = mediaUrl;

      // Best-effort image variant generation
      try {
        const { variants } = await generateVariants({
          filePath,
          filename,
          outputDir: OPTIMIZED_DIR,
          urlBase: OPTIMIZED_URL_BASE,
        });
        const webpVariant = variants.find((v) => v.format === 'webp');
        if (webpVariant) {
          thumbnailUrl = webpVariant.url;
        }
      } catch (optErr) {
        logger.warn('Image variant generation skipped', { error: optErr.message });
      }
    }

    if (!body.title) {
      const ext = path.extname(originalname);
      body.title = path.basename(originalname, ext).replace(/[-_]+/g, ' ');
    }
  } else if (storageKey) {
    if (!storageKey.startsWith('gallery/')) throw ApiError.badRequest('The uploaded media reference is invalid.');
    storageProvider = 'supabase';
    mediaUrl = publicObjectUrl(storageBuckets.media, storageKey);
    if (body.contentType?.startsWith('video/')) {
      mediaType = 'video';
      thumbnailUrl = body.thumbnailStorageKey?.startsWith('gallery/')
        ? publicObjectUrl(storageBuckets.media, body.thumbnailStorageKey)
        : thumbnailUrl;
    } else {
      mediaType = 'photo';
      thumbnailUrl = mediaUrl;
    }
    if (!body.title) {
      const ext = path.extname(body.originalName || '');
      body.title = path.basename(body.originalName || 'Photo', ext).replace(/[-_]+/g, ' ');
    }
  } else if (externalVideoUrl) {
    mediaType = 'video';
    externalVideoUrl = externalVideoUrl.trim();
    if (body.thumbnailStorageKey?.startsWith('gallery/')) {
      thumbnailUrl = publicObjectUrl(storageBuckets.media, body.thumbnailStorageKey);
    }
    const ytId = extractYoutubeId(externalVideoUrl);
    const vimeoId = extractVimeoId(externalVideoUrl);

    if (ytId) {
      storageProvider = 'youtube';
      mediaUrl = externalVideoUrl;
      if (!thumbnailUrl) {
        thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      }
    } else if (vimeoId) {
      storageProvider = 'vimeo';
      mediaUrl = externalVideoUrl;
    } else {
      storageProvider = 'external';
      mediaUrl = externalVideoUrl;
    }
  }

  if (!mediaUrl && !externalVideoUrl) {
    throw ApiError.badRequest('Please upload a file or provide a valid media/video URL.');
  }

  const created = await mediaGalleryRepository.create({
    mediaType,
    title: (body.title || 'Untitled Media').trim(),
    slug: body.slug,
    description: (body.description || '').trim() || null,
    caption: (body.caption || '').trim() || null,
    altText: (body.altText || body.alt_text || body.title || 'G3B Education Media').trim(),
    category: (body.category || '').trim() || (mediaType === 'video' ? 'Student Experiences' : 'Events & Activities'),
    storageProvider,
    storageKey,
    mediaUrl,
    thumbnailUrl: thumbnailUrl || mediaUrl,
    externalVideoUrl,
    duration: (body.duration || '').trim() || null,
    isFeatured: Boolean(body.isFeatured !== undefined ? body.isFeatured : body.is_featured),
    status: body.status || 'published',
    sortOrder: Number(body.sortOrder !== undefined ? body.sortOrder : body.sort_order) || 0,
    createdBy: req.user?.id || null,
  });

  await recordAudit(req, {
    action: 'media_item.create',
    entityType: 'media_item',
    entityId: created.id,
    summary: `Created ${mediaType}: "${created.title}"`,
  });

  res.status(201).json({ success: true, data: created });
}

/**
 * POST /api/admin/media-gallery/bulk-photos
 * Bulk upload multiple photos at once.
 */
export async function bulkUploadPhotos(req, res) {
  const uploaded = Array.isArray(req.body?.photos) ? req.body.photos : req.files;
  if (!uploaded || !uploaded.length) {
    throw ApiError.badRequest('No photo files were uploaded.');
  }
  if (uploaded.length > 20) throw ApiError.badRequest('Upload no more than 20 photos at once.');

  const category = req.body.category?.trim() || 'Events & Activities';
  const status = req.body.status || 'published';
  const createdItems = [];

  for (const file of uploaded) {
    const isStored = !file.buffer && typeof file.storageKey === 'string';
    if (isStored && (!file.storageKey.startsWith('gallery/') || !file.contentType?.startsWith('image/'))) {
      throw ApiError.badRequest('One of the uploaded photo references is invalid.');
    }
    const filename = isStored ? path.posix.basename(file.storageKey) : file.filename;
    const originalname = isStored ? file.originalName : file.originalname;
    const filePath = isStored ? null : file.path;
    const mediaUrl = isStored
      ? publicObjectUrl(storageBuckets.media, file.storageKey)
      : `${URL_BASE}/${filename}`;
    let thumbnailUrl = mediaUrl;

    if (!isStored) try {
      const { variants } = await generateVariants({
        filePath,
        filename,
        outputDir: OPTIMIZED_DIR,
        urlBase: OPTIMIZED_URL_BASE,
      });
      const webpVariant = variants.find((v) => v.format === 'webp');
      if (webpVariant) thumbnailUrl = webpVariant.url;
    } catch {
      // Continue with original url if Sharp fails
    }

    const ext = path.extname(originalname);
    const cleanTitle = path.basename(originalname, ext).replace(/[-_]+/g, ' ');

    const item = await mediaGalleryRepository.create({
      mediaType: 'photo',
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      description: null,
      caption: null,
      altText: cleanTitle,
      category,
      storageProvider: isStored ? 'supabase' : 'local',
      storageKey: isStored ? file.storageKey : filename,
      mediaUrl,
      thumbnailUrl,
      status,
      isFeatured: false,
      sortOrder: 0,
      createdBy: req.user?.id || null,
    });

    createdItems.push(item);
  }

  await recordAudit(req, {
    action: 'media_item.bulk_upload',
    entityType: 'media_item',
    summary: `Bulk uploaded ${createdItems.length} photos`,
  });

  res.status(201).json({
    success: true,
    data: createdItems,
    count: createdItems.length,
  });
}

/**
 * PATCH /api/admin/media-gallery/:id
 */
export async function updateMedia(req, res) {
  const existing = await mediaGalleryRepository.getById(req.params.id);
  if (!existing) throw ApiError.notFound('Media item not found.');

  const body = req.body || {};
  let { externalVideoUrl, thumbnailUrl } = body;

  if (externalVideoUrl && externalVideoUrl.trim() !== existing.externalVideoUrl) {
    const ytId = extractYoutubeId(externalVideoUrl.trim());
    if (ytId && !thumbnailUrl) {
      thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    }
  }

  const updated = await mediaGalleryRepository.update(req.params.id, {
    ...body,
    thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
  });

  await recordAudit(req, {
    action: 'media_item.update',
    entityType: 'media_item',
    entityId: updated.id,
    summary: `Updated ${updated.mediaType}: "${updated.title}"`,
  });

  res.json({ success: true, data: updated });
}

/**
 * DELETE /api/admin/media-gallery/:id
 */
export async function deleteMedia(req, res) {
  const existing = await mediaGalleryRepository.getById(req.params.id);
  if (!existing) throw ApiError.notFound('Media item not found.');

  if (existing.storageProvider === 'supabase' && existing.storageKey) {
    const keys = [existing.storageKey];
    if (existing.thumbnailUrl?.startsWith(publicObjectUrl(storageBuckets.media, ''))) {
      const prefix = publicObjectUrl(storageBuckets.media, '');
      const thumbnailKey = decodeURIComponent(existing.thumbnailUrl.slice(prefix.length));
      if (thumbnailKey && thumbnailKey !== existing.storageKey) keys.push(thumbnailKey);
    }
    await deleteObjects(storageBuckets.media, keys);
  }

  // Delete local file if present
  if (existing.storageProvider === 'local' && existing.storageKey) {
    try {
      await fs.unlink(path.join(uploadsRoot, existing.storageKey));
    } catch {
      // File may already be absent
    }
  }

  await mediaGalleryRepository.delete(req.params.id);
  await recordAudit(req, {
    action: 'media_item.delete',
    entityType: 'media_item',
    entityId: req.params.id,
    summary: `Deleted ${existing.mediaType}: "${existing.title}"`,
  });

  res.json({ success: true, message: 'Media item deleted successfully.' });
}

/**
 * PATCH /api/admin/media-gallery/reorder
 */
export async function reorderMedia(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items)) throw ApiError.badRequest('Items must be an array of { id, sortOrder }.');

  await mediaGalleryRepository.reorder(items);
  await recordAudit(req, {
    action: 'media_item.reorder',
    entityType: 'media_item',
    summary: `Reordered ${items.length} media items`,
  });

  res.json({ success: true, message: 'Media items reordered successfully.' });
}
