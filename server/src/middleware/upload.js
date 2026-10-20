import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(__dirname, '../../', env.uploads.dir);

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

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
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new ApiError(400, 'Only JPEG, PNG, WEBP, GIF, AVIF or SVG images are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('image');

export default uploadImage;
