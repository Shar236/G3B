import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import env from './config/env.js';
import routes from './routes/index.js';
import { resolveUser } from './middleware/auth.js';
import { globalRateLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { uploadsRoot } from './middleware/upload.js';
import { createRedirectMiddleware } from './middleware/redirects.js';
import { createSiteRenderer } from './middleware/siteRenderer.js';
import logger from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Compression for all JSON, HTML, CSS and text responses
  app.use(
    compression({
      threshold: 1024,
      filter(req, res) {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );

  // Behind a reverse proxy (nginx, Render, Railway...) so req.ip / protocol work.
  app.set('trust proxy', env.isProduction ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Uploaded media is served from this origin and must be embeddable.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  const corsMiddleware = cors((req, callback) => {
    const origin = req.header('Origin');
    if (!origin) return callback(null, { origin: true });

    const cleanOrigin = origin.replace(/\/+$/, '');
    const host = req.get('host');
    const isSameHost = Boolean(host && (cleanOrigin === `https://${host}` || cleanOrigin === `http://${host}`));
    const isAllowed = isSameHost || env.clientOrigins.includes(cleanOrigin) || env.clientOrigins.includes(origin);

    if (isAllowed) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Student-CSRF-Token', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID', 'Retry-After', 'Content-Disposition'],
        maxAge: 86400,
      });
    }

    logger.warn('Blocked CORS origin', { origin, cleanOrigin, allowed: env.clientOrigins });
    return callback(null, { origin: false });
  });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const supplied = req.get('x-request-id');
    req.requestId = typeof supplied === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/student')) res.setHeader('Cache-Control', 'no-store');
    next();
  });

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan(':method :url :status :res[content-length] - :response-time ms', {
        stream: { write: (message) => logger.info(message.trim()) },
      }),
    );
  }

  // Static media uploaded through the admin dashboard with optimal caching headers.
  app.use(
    `/${env.uploads.dir}`,
    express.static(uploadsRoot, {
      maxAge: '30d',
      immutable: true,
      fallthrough: true,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        // Uploaded SVGs must remain inert when opened directly on our origin.
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  // Resolve the (optional) authenticated user for every request.
  app.use(resolveUser);

  // Admin-managed redirects are honoured by the server (real 301/302 responses
  // for crawlers and non-JS clients), never by client-side React routing.
  app.use(createRedirectMiddleware());

  app.use('/api', globalRateLimiter, routes);

  // Built SPA + database-backed robots.txt, sitemap.xml and prerendered <head>.
  // Only active once `client/dist` exists; development keeps using the Vite dev
  // server, which proxies /api here.
  const renderer = env.serveClient ? createSiteRenderer() : null;
  if (renderer) {
    // Generated robots.txt / sitemap.xml must be mounted before the static
    // handler, otherwise the build copies in client/public would shadow them.
    app.use(renderer.siteFiles);
    app.use(
      express.static(renderer.distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.use(renderer.middleware);
  } else {
    // Root ping so `GET /` does not 404 confusingly when there is no build.
    app.get('/', (_req, res) => {
      res.json({ success: true, service: 'G3B Education API', docs: '/api/health' });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
