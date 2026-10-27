import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(__dirname, '../../', env.uploads.dir);
export const assessmentReportsRoot = path.resolve(__dirname, '../../private/assessment-reports');

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
if (!fs.existsSync(assessmentReportsRoot)) fs.mkdirSync(assessmentReportsRoot, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

const EXTENSIONS = {
  'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'],
  'image/gif': ['.gif'], 'image/svg+xml': ['.svg'], 'image/avif': ['.avif'],
  'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'],
};
export const validMediaExtension = (file) => EXTENSIONS[file.mimetype]?.includes(path.extname(file.originalname).toLowerCase()) === true;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10) || '.bin';
    const safeBase = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${ext}`);
  },
});

/** Image upload middleware: restricts type and size, stores under server/uploads. */
export const uploadImage = multer({
  storage,
  limits: { fileSize: env.uploads.maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype) || !validMediaExtension(file)) {
      cb(new ApiError(400, 'Only JPEG, PNG, WEBP, GIF, AVIF or SVG images are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('image');

/** Upload multiple photos at once (up to 20 images). */
export const uploadMultiplePhotos = multer({
  storage,
  limits: { fileSize: env.uploads.maxBytes, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype) || !validMediaExtension(file)) {
      cb(new ApiError(400, 'Only JPEG, PNG, WEBP, GIF, AVIF or SVG images are allowed.'));
      return;
    }
    cb(null, true);
  },
}).array('photos', 20);

const ALLOWED_MEDIA_MIME = new Set([
  ...ALLOWED_MIME,
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

/** General media upload middleware: accepts images or self-hosted video files up to 100MB. */
export const uploadMediaFile = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MEDIA_MIME.has(file.mimetype) || !validMediaExtension(file)) {
      cb(new ApiError(400, 'Only JPEG, PNG, WEBP, GIF, AVIF, SVG or MP4/WebM videos are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('file');

const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, assessmentReportsRoot),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

export const uploadAssessmentReport = multer({
  storage: reportStorage,
  limits: { fileSize: env.uploads.maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => file.mimetype === 'application/pdf' ? cb(null, true) : cb(new ApiError(400, 'Assessment reports must be PDF files.')),
}).single('report');

/** Private assignment PDFs are held in memory until stored in PostgreSQL. */
export const uploadLearningPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.min(env.uploads.maxBytes, 10 * 1024 * 1024), files: 1 },
  fileFilter: (_req, file, cb) => {
    const valid = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(valid ? null : ApiError.badRequest('Only PDF files are supported.'), valid);
  },
}).single('file');

export default uploadImage;
