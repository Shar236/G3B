import { settingsRepository } from '../repositories/settingsRepository.js';
import { absoluteUrl } from '../services/seoRenderer.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { visibleHomepageSections } from '../../../shared/publicContentPolicy.js';
import { listPublicPagesWithDefaults, findPublicPageWithDefaults } from '../services/builtInPages.js';

/** The canonical site origin used for absolute URLs (canonical, OG, sitemap). */
export function siteOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/** Only published values are ever exposed publicly. */
function publicSeo(seo) {
  if (!seo) return null;
  return {
    seoTitle: seo.seoTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    metaRobots: seo.metaRobots || 'index,follow',
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    primaryKeyword: seo.primaryKeyword,
    secondaryKeywords: seo.secondaryKeywords,
    structuredData: seo.structuredData,
  };
}

function publicPage(page, req) {
  const origin = siteOrigin(req);
  return {
    id: page.id,
    name: page.name,
    route: page.route,
    pageType: page.pageType,
    template: page.template || 'default',
    isIndexable: page.isIndexable,
    updatedAt: page.updatedAt,
    canonical: absoluteUrl(origin, page.route),
    seo: publicSeo(page.seo),
    sections: (page.route === '/' ? visibleHomepageSections(page.sections || []) : page.sections || []).filter((section) => section.isActive !== false).map((section) => ({
      sectionKey: section.sectionKey,
      label: section.label,
      headingLevel: section.headingLevel,
      headingText: section.headingText,
      description: section.description,
      ctaLabel: section.ctaLabel,
      ctaUrl: section.ctaUrl,
      imageUrl: section.imageUrl,
      imageAlt: section.imageAlt,
      imageCaption: section.imageCaption,
      sortOrder: section.sortOrder,
    })),
  };
}

/** GET /api/seo/pages - every published page with its live SEO metadata. */
export async function listPublicPages(req, res) {
  const pages = await listPublicPagesWithDefaults();
  res.json({ success: true, data: pages.map((page) => publicPage(page, req)) });
}

/** GET /api/seo/page?route=/services - metadata for a single published route. */
export async function getPublicPageSeo(req, res) {
  const route = typeof req.query.route === 'string' ? req.query.route : null;
  if (!route) throw ApiError.badRequest('A `route` query parameter is required.');

  const page = await findPublicPageWithDefaults(route);
  if (!page) throw ApiError.notFound('No published page is registered for that route.');
  res.json({ success: true, data: publicPage(page, req) });
}

/**
 * GET /api/seo/context
 * Everything the SPA and the crawler renderer need in one call: site defaults
 * (from site settings) plus the per-route metadata registry.
 */
export async function getSeoContext(req, res) {
  const [settings, pages] = await Promise.all([
    settingsRepository.all(),
    listPublicPagesWithDefaults(),
  ]);

  res.json({
    success: true,
    data: {
      origin: siteOrigin(req),
      defaults: {
        siteName: settings.site_name || 'G3B Education',
        defaultTitle: settings.seo_default_title || settings.site_name || 'G3B Education',
        defaultDescription: settings.seo_default_description || settings.meta_description || null,
        defaultImage: settings.og_image_url || settings.logo_url || null,
        twitterHandle: settings.twitter_handle || null,
        organizationLogo: settings.logo_url || null,
      },
      pages: pages.map((page) => publicPage(page, req)),
      generatedAt: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
}

export default { listPublicPages, getPublicPageSeo, getSeoContext, siteOrigin };
