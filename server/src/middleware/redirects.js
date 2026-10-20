import { redirectsRepository } from '../repositories/redirectsRepository.js';
import logger from '../utils/logger.js';

const CACHE_TTL_MS = 30_000;

/**
 * Applies admin-managed redirects on the server.
 *
 * This is deliberately server-side: the Master Prompt requires that redirects
 * are honoured by the server/hosting layer, not by client-side React routing,
 * so crawlers and non-JS clients receive a real 301/302 response.
 */
export function createRedirectMiddleware() {
  let cache = { loadedAt: 0, routes: new Map() };

  async function loadRoutes() {
    if (Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.routes;
    const rows = await redirectsRepository.listActive();
    cache = {
      loadedAt: Date.now(),
      routes: new Map(rows.map((row) => [row.sourcePath, row])),
    };
    return cache.routes;
  }

  return async function applyRedirects(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const pathname = req.path || '/';
    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) return next();

    try {
      const routes = await loadRoutes();
      const match = routes.get(pathname);
      if (!match) return next();

      // Hit counting must never delay or break the redirect itself.
      redirectsRepository.recordHit(match.id).catch((error) => {
        logger.warn('Could not record a redirect hit', { id: match.id, error: error.message });
      });

      res.redirect(match.statusCode, match.destinationPath);
    } catch (error) {
      logger.error('Redirect lookup failed', { path: pathname, error: error.message });
      next();
    }
  };
}

export default createRedirectMiddleware;
