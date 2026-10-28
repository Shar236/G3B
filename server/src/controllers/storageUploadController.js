import crypto from 'node:crypto';
import path from 'node:path';
import env from '../config/env.js';
import { createSignedUploadUrl, storageBuckets } from '../services/supabaseStorage.js';
import { learningRepository } from '../repositories/learningRepository.js';
import assessmentRepository from '../repositories/assessmentRepository.js';
import ApiError from '../utils/ApiError.js';

const imageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);
const mediaExtensions = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/svg+xml': ['.svg'],
  'image/avif': ['.avif'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'application/pdf': ['.pdf'],
};

const safeName = (name) => {
  const extension = path.extname(name).toLowerCase().slice(0, 10);
  const base = path.basename(name, extension).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'upload';
  return `${crypto.randomUUID()}-${base}${extension}`;
};

async function parseUpload(req) {
  const { purpose, originalName, contentType } = req.body || {};
  const size = Number(req.body?.size);
  if (typeof originalName !== 'string' || originalName.length < 1 || originalName.length > 255) {
    throw ApiError.badRequest('Provide a valid file name.');
  }
  if (!Number.isSafeInteger(size) || size < 1) throw ApiError.badRequest('Provide a valid file size.');
  if (typeof contentType !== 'string') throw ApiError.badRequest('Provide a valid file type.');

  const extension = path.extname(originalName).toLowerCase();
  let bucket;
  let prefix;
  let maxBytes;
  if (!['admin', 'editor', 'staff', 'counsellor'].includes(req.user?.role)) throw ApiError.forbidden();

  if (purpose === 'content-image' || purpose === 'gallery-photo') {
    if (!imageTypes.has(contentType) || !mediaExtensions[contentType]?.includes(extension)) {
      throw ApiError.badRequest('Choose a supported image file.');
    }
    if (!['admin', 'editor'].includes(req.user.role)) {
      throw ApiError.forbidden();
    }
    bucket = storageBuckets.media;
    prefix = purpose === 'content-image' ? 'content' : 'gallery';
    maxBytes = env.uploads.maxBytes;
  } else if (purpose === 'gallery-video') {
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType) || !mediaExtensions[contentType]?.includes(extension)) {
      throw ApiError.badRequest('Choose an MP4, WebM, or MOV video file.');
    }
    if (!['admin', 'editor'].includes(req.user.role)) throw ApiError.forbidden();
    bucket = storageBuckets.media;
    prefix = 'gallery';
    maxBytes = 100 * 1024 * 1024;
  } else if (purpose === 'assessment-report' || purpose === 'learning-file') {
    if (!['admin', 'staff', 'counsellor'].includes(req.user.role)) throw ApiError.forbidden();
    if (!mediaExtensions[contentType]?.includes(extension) || contentType !== 'application/pdf') {
      throw ApiError.badRequest('Choose a PDF file.');
    }
    if (purpose === 'assessment-report' && !/^\d+$/.test(String(req.body.assignmentId || ''))) {
      throw ApiError.badRequest('Provide a valid assessment assignment.');
    }
    if (purpose === 'learning-file' && !/^\d+$/.test(String(req.body.assignmentId || ''))) {
      throw ApiError.badRequest('Provide a valid learning assignment.');
    }
    if (purpose === 'assessment-report' && !await assessmentRepository.findAssignmentById(req.body.assignmentId)) {
      throw ApiError.notFound('Assessment assignment not found.');
    }
    if (purpose === 'learning-file' && !await learningRepository.findAdmin(req.body.assignmentId)) {
      throw ApiError.notFound('Learning assignment not found.');
    }
    bucket = storageBuckets.private;
    prefix = purpose === 'assessment-report'
      ? `reports/${req.body.assignmentId}`
      : `learning/${req.body.assignmentId}`;
    maxBytes = purpose === 'learning-file'
      ? Math.min(env.uploads.maxBytes, 10 * 1024 * 1024)
      : env.uploads.maxBytes;
  } else {
    throw ApiError.badRequest('Unsupported upload purpose.');
  }

  if (size > maxBytes) {
    throw ApiError.badRequest(`The selected file exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB upload limit.`);
  }

  return { bucket, path: `${prefix}/${safeName(originalName)}`, originalName, contentType, size };
}

export async function createUploadUrl(req, res) {
  const upload = await parseUpload(req);
  const ticket = await createSignedUploadUrl(upload.bucket, upload.path);
  res.json({ success: true, data: { ...ticket, ...upload } });
}

export default { createUploadUrl };
