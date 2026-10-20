import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pagesRepository } from '../repositories/pagesRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectHead,
  renderMetaTags,
} from '../services/seoRenderer.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default location of the built SPA, relative to this file. */
export const DEFAULT_CLIENT_DIST = path.resolve(__dirname, '../../../client/dist');

const ADMIN_NOINDEX = '<meta name="robots" content="noindex,nofollow,noarchive" />';

function siteOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * Serves `robots.txt` and `sitemap.xml` generated from the live page registry.
 * Must be mounted *before* `express.static` so the static build copies in
 * `client/public` can never shadow the generated versions.
 */
export function createSiteFiles() {
  const adminRoute = env.admin.route;

  return async function siteFiles(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const pathname = req.path || '/';
    if (pathname !== '/robots.txt' && pathname !== '/sitemap.xml') return next();

    const origin = siteOrigin(req);
    try {
      if (pathname === '/robots.txt') {
        res
          .type('text/plain')
          .set('Cache-Control', 'public, max-age=300')
          .send(buildRobotsTxt(origin, adminRoute));
        return;
      }

      const pages = await pagesRepository.list({ status: 'published' });
      res
        .type('application/xml')
        .set('Cache-Control', 'public, max-age=300')
        .send(buildSitemapXml(pages, origin));
    } catch (error) {
      logger.error('Could not generate a site file', { path: pathname, error: error.message });
      next();
    }
  };
}

/**
 * Serves the SPA shell with database-backed `<head>` tags.
 *
 * The SPA sets its metadata with JavaScript, so crawlers that do not execute
 * JavaScript would otherwise see the hard-coded tags in `index.html` forever.
 * This middleware renders the *published* metadata into the HTML the server
 * returns, which is what closes the loop between the admin SEO manager and the
 * public page.
 *
 * @returns {{ distDir: string, middleware: import('express').RequestHandler } | null}
 *          `null` when the client has not been built yet (development).
 */
export function createPageRenderer({ distDir = DEFAULT_CLIENT_DIST } = {}) {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    logger.warn('Client build not found; serving API only. Run `npm run build` in client/ to enable prerendered SEO tags.', {
      distDir,
    });
    return null;
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const adminRoute = env.admin.route;

  async function loadDefaults() {
    try {
      const settings = await settingsRepository.all();
      return {
        siteName: settings.site_name || 'G3B Education',
        defaultTitle: settings.seo_default_title || 'G3B Education | Study Abroad & Career Guidance',
        defaultDescription: settings.seo_default_description || settings.meta_description || null,
        defaultImage: settings.og_image_url || settings.logo_url || null,
        organizationLogo: settings.logo_url || null,
      };
    } catch (error) {
      logger.error('Could not load site defaults for SEO rendering', { error: error.message });
      return { siteName: 'G3B Education', defaultTitle: 'G3B Education' };
    }
  }

  async function middleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const pathname = req.path || '/';
    if (pathname === '/api' || pathname.startsWith('/api/')) return next();
    if (pathname.startsWith('/uploads/')) return next();

    const origin = siteOrigin(req);

    try {
      // Never prerender the private admin area, and always mark it noindex.
      if (pathname === adminRoute || pathname.startsWith(`${adminRoute}/`)) {
        res
          .status(200)
          .type('html')
          .set('X-Robots-Tag', 'noindex, nofollow, noarchive')
          .send(injectHead(indexHtml, ADMIN_NOINDEX));
        return;
      }

      if (!req.accepts('html')) return next();

      const page = await pagesRepository.findPublishedByRoute(pathname);
      const defaults = await loadDefaults();

      if (page) {
        const tags = renderMetaTags(page, defaults, origin);
        res.status(200).type('html').send(injectHead(indexHtml, tags));
        return;
      }

      // Unregistered route: real 404 status for crawlers, and the SPA renders
      // its own "not found" screen for visitors.
      res
        .status(404)
        .type('html')
        .send(
          injectHead(
            indexHtml,
            `${ADMIN_NOINDEX}\n    <title>Page not found | ${defaults.siteName}</title>`,
          ),
        );
    } catch (error) {
      // Rendering must never take the site down: fall back to the plain shell.
      logger.error('SEO rendering failed; serving the unmodified shell', {
        path: pathname,
        error: error.message,
      });
      res.status(200).type('html').send(indexHtml);
    }
  }

  return { distDir, middleware };
}

/** Convenience wrapper: the generated site files plus the page renderer. */
export function createSiteRenderer(options = {}) {
  const renderer = createPageRenderer(options);
  if (!renderer) return null;
  return { ...renderer, siteFiles: createSiteFiles() };
}

export default createSiteRenderer;
