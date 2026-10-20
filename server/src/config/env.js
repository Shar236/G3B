import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env regardless of the current working directory.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const env = {
  nodeEnv,
  isProduction,
  port: toInt(process.env.PORT, 5000),

  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'g3b_education',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
    ssl: toBool(process.env.DB_SSL, false),
  },

  auth: {
    // The fallback secret is only tolerated in development.
    secret: process.env.JWT_SECRET || 'g3b-development-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  cookie: {
    secure: toBool(process.env.COOKIE_SECURE, isProduction),
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
  },

  admin: {
    name: process.env.ADMIN_NAME || 'G3B Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@g3beducation.com',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    // The private dashboard base path. Keep it in sync with the client's
    // VITE_ADMIN_ROUTE so both sides agree on where the admin area lives.
    // This is *not* a security control: authorisation is enforced server-side.
    route: process.env.ADMIN_ROUTE || process.env.VITE_ADMIN_ROUTE || '/manage-portal',
  },

  mail: {
    host: process.env.MAIL_HOST || '',
    port: toInt(process.env.MAIL_PORT, 587),
    secure: toBool(process.env.MAIL_SECURE, false),
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'G3B Education <no-reply@g3beducation.com>',
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || '',
    get enabled() {
      return Boolean(this.host);
    },
  },

  uploads: {
    provider: process.env.UPLOAD_STORAGE_PROVIDER || 'local',
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxBytes: toInt(process.env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
  },

  // Backend-only. Never use VITE_ prefixes for YouTube credentials.
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    // Optional owner-maintained playlist containing confirmed Shorts only.
    shortsPlaylistId: process.env.YOUTUBE_SHORTS_PLAYLIST_ID || '',
    syncIntervalMinutes: Math.max(15, Math.min(41760, toInt(process.env.YOUTUBE_SYNC_INTERVAL_MINUTES, 360))),
    maxPages: Math.max(1, Math.min(2000, toInt(process.env.YOUTUBE_SYNC_MAX_PAGES, 500))),
    timeoutMs: Math.max(1000, Math.min(30000, toInt(process.env.YOUTUBE_REQUEST_TIMEOUT_MS, 12000))),
    maxSyncMs: Math.max(15000, Math.min(600000, toInt(process.env.YOUTUBE_SYNC_MAX_MS, 120000))),
    autoSync: toBool(process.env.YOUTUBE_AUTO_SYNC, true),
  },

  // Serve the built SPA (and the prerendered SEO tags) from Express.
  // Enabled by default in production; in development Vite serves the client and
  // proxies /api here. Set SERVE_CLIENT=true locally to verify prerendering.
  serveClient: toBool(process.env.SERVE_CLIENT, isProduction),

  rateLimit: {
    enquiryWindowMinutes: toInt(process.env.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES, 15),
    enquiryMax: toInt(process.env.ENQUIRY_RATE_LIMIT_MAX, 8),
    loginWindowMinutes: toInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15),
    loginMax: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  },
};

/**
 * Validate that essential configuration is present.
 * In production we fail loudly; in development we only warn so local setup is easy.
 */
export function validateEnv() {
  const problems = [];

  if (env.isProduction) {
    if (!process.env.JWT_SECRET || env.auth.secret.length < 32) {
      problems.push('JWT_SECRET must be set to a random string of at least 32 characters in production.');
    }
    if (!process.env.DB_USER) problems.push('DB_USER is required in production.');
    if (!process.env.DB_NAME) problems.push('DB_NAME is required in production.');
    if (env.cookie.sameSite === 'none' && !env.cookie.secure) {
      problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true in production.');
    }
  }

  if (problems.length > 0) {
    const message = `Invalid environment configuration:\n- ${problems.join('\n- ')}`;
    throw new Error(message);
  }

  if (!env.isProduction && env.auth.secret === 'g3b-development-secret-change-me') {
    // eslint-disable-next-line no-console
    console.warn('[config] Using the development JWT secret. Set JWT_SECRET before deploying.');
  }

  if (!env.mail.enabled) {
    // eslint-disable-next-line no-console
    console.warn('[config] MAIL_HOST is not configured. Email notifications are disabled and will be queued.');
  }

  return env;
}

export default env;
