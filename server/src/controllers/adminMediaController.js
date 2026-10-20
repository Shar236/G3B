import fs from 'node:fs/promises';
import path from 'node:path';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { uploadsRoot } from '../middleware/upload.js';
import { generateVariants, readImageMetadata, removeFiles, OPTIMIZED_FOLDER } from '../services/imageOptimizer.js';
import { recordAudit } from '../services/auditLog.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const URL_BASE = `/${env.uploads.dir}`;
const OPTIMIZED_DIR = path.join(uploadsRoot, OPTIMIZED_FOLDER);
const OPTIMIZED_URL_BASE = `${URL_BASE}/${OPTIMIZED_FOLDER}`;

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

/** Read width/height and generate renditions for a stored original. */
async function optimise(filePath, filename) {
  let metadata = { width: null, height: null, format: null };
  try {
    metadata = await readImageMetadata(filePath);
  } catch (error) {
    logger.warn('Could not read image metadata', { filename, error: error.message });
  }

  const variants = await generateVariants({
    filePath,
    filename,
    outputDir: OPTIMIZED_DIR,
    urlBase: OPTIMIZED_URL_BASE,
  });

  return { metadata, variants };
}

/** GET /api/admin/media */
export async function listMedia(req, res) {
  const result = await mediaRepository.list({
    search: req.query.search || undefined,
    folder: req.query.folder || undefined,
    pageId: req.query.pageId,
    page: Number.parseInt(req.query.page, 10) || 1,
    perPage: Math.min(Number.parseInt(req.query.perPage, 10) || 40, 100),
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
}

/** GET /api/admin/media/stats */
export async function mediaStats(_req, res) {
  res.json({ success: true, data: await mediaRepository.stats() });
}

/** GET /api/admin/media/unused */
export async function listUnusedMedia(_req, res) {
  res.json({ success: true, data: await mediaRepository.listUnused() });
}

/** GET /api/admin/media/:id */
export async function getMedia(req, res) {
  const asset = await mediaRepository.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Image not found.');
  res.json({ success: true, data: { ...asset, usages: await mediaRepository.findUsages(asset) } });
}

/** GET /api/admin/media/:id/usages */
export async function mediaUsages(req, res) {
  const asset = await mediaRepository.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Image not found.');
  res.json({ success: true, data: await mediaRepository.findUsages(asset) });
}

/** POST /api/admin/media - multipart upload (field "image") + auto-optimisation. */
export async function uploadMedia(req, res) {
  if (!req.file) throw ApiError.badRequest('No image file was uploaded.');

  const { filename, originalname, mimetype, size, path: filePath } = req.file;
  const { metadata, variants } = await optimise(filePath, filename);

  const asset = await mediaRepository.create({
    filename,
    originalName: originalname,
    url: `${URL_BASE}/${filename}`,
    path: filePath,
    mimeType: mimetype,
    extension: path.extname(filename).replace('.', '').toLowerCase() || 'bin',
    sizeBytes: size,
    width: metadata.width,
    height: metadata.height,
    altText: req.body.altText?.trim() || null,
    title: req.body.title?.trim() || null,
    caption: req.body.caption?.trim() || null,
    description: req.body.description?.trim() || null,
    folder: slugify(req.body.folder) || 'general',
    pageId: req.body.pageId ? Number.parseInt(req.body.pageId, 10) : null,
    isOptimized: variants.length > 0,
    createdBy: req.user.id,
  });

  if (variants.length > 0) await mediaRepository.replaceVariants(asset.id, variants);

  await recordAudit(req, {
    action: 'media.upload',
    entityType: 'media',
    entityId: asset.id,
    summary: `Uploaded image "${filename}" (${variants.length} renditions)`,
  });

  res.status(201).json({ success: true, data: await mediaRepository.findById(asset.id) });
}

/** PATCH /api/admin/media/:id - alt text, title, caption, folder, page assignment. */
export async function updateMedia(req, res) {
  const existing = await mediaRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Image not found.');

  const updated = await mediaRepository.update(existing.id, req.body);
  await recordAudit(req, {
    action: 'media.update',
    entityType: 'media',
    entityId: existing.id,
    summary: `Updated image metadata for "${existing.filename}"`,
    changes: req.body,
  });
  res.json({ success: true, data: updated });
}

/** POST /api/admin/media/:id/rename - descriptive filenames for SEO. */
export async function renameMedia(req, res) {
  const existing = await mediaRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Image not found.');

  const extension = existing.extension || path.extname(existing.filename).replace('.', '') || 'bin';
  const base = slugify(req.body.name || req.body.filename);
  if (!base) throw ApiError.badRequest('Provide a valid file name.');

  const newFilename = `${base}.${extension}`;
  if (newFilename === existing.filename) {
    res.json({ success: true, data: existing });
    return;
  }

  const clash = await mediaRepository.findByFilename(newFilename);
  if (clash && clash.id !== existing.id) {
    throw ApiError.conflict('Another image already uses that filename.', {
      name: 'That filename is already taken.',
    });
  }

  const newPath = path.join(uploadsRoot, newFilename);
  try {
    await fs.rename(existing.path, newPath);
  } catch (error) {
    throw ApiError.internal(`Could not rename the file on disk: ${error.message}`);
  }

  // Renditions are derived from the filename, so refresh them for the new name.
  await removeFiles(existing.variants.map((variant) => variant.path));
  const { variants } = await optimise(newPath, newFilename);

  const updated = await mediaRepository.update(existing.id, {
    filename: newFilename,
    path: newPath,
    url: `${URL_BASE}/${newFilename}`,
    isOptimized: variants.length > 0,
  });
  await mediaRepository.replaceVariants(existing.id, variants);

  await recordAudit(req, {
    action: 'media.rename',
    entityType: 'media',
    entityId: existing.id,
    summary: `Renamed image "${existing.filename}" to "${newFilename}"`,
  });

  res.json({ success: true, data: updated });
}

/** POST /api/admin/media/:id/optimize - regenerate renditions on demand. */
export async function reoptimizeMedia(req, res) {
  const existing = await mediaRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Image not found.');

  await removeFiles(existing.variants.map((variant) => variant.path));
  const { metadata, variants } = await optimise(existing.path, existing.filename);

  const updated = await mediaRepository.update(existing.id, {
    width: metadata.width ?? existing.width,
    height: metadata.height ?? existing.height,
    isOptimized: variants.length > 0,
  });
  await mediaRepository.replaceVariants(existing.id, variants);

  await recordAudit(req, {
    action: 'media.optimize',
    entityType: 'media',
    entityId: existing.id,
    summary: `Re-ran optimisation for "${existing.filename}" (${variants.length} renditions)`,
  });

  res.json({ success: true, data: updated });
}

/** DELETE /api/admin/media/:id - removes the row and every file it produced. */
export async function deleteMedia(req, res) {
  const existing = await mediaRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Image not found.');

  await mediaRepository.remove(existing.id);
  await removeFiles([existing.path, ...existing.variants.map((variant) => variant.path)]);

  await recordAudit(req, {
    action: 'media.delete',
    entityType: 'media',
    entityId: existing.id,
    summary: `Deleted image "${existing.filename}"`,
  });

  res.json({ success: true, data: { message: 'Image deleted.' } });
}

export default {
  listMedia,
  mediaStats,
  listUnusedMedia,
  getMedia,
  mediaUsages,
  uploadMedia,
  updateMedia,
  renameMedia,
  reoptimizeMedia,
  deleteMedia,
};
