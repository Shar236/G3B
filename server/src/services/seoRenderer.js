/**
 * Server-side rendering helpers for the public HTML.
 *
 * These functions exist because the SPA writes `<head>` tags with JavaScript,
 * which crawlers that do not execute JavaScript never see. The Express server
 * therefore renders the same, database-backed metadata into the HTML it serves.
 */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Build the absolute public URL for a route. The homepage keeps its slash. */
export function absoluteUrl(origin, route) {
  const clean = route && route !== '/' ? route : '/';
  return `${origin}${clean}`;
}

/** A page is indexable only when both the page flag and the robots directive allow it. */
export function isIndexable(page) {
  if (!page) return false;
  if (page.isIndexable === false) return false;
  const robots = String(page.seo?.metaRobots || 'index,follow').toLowerCase();
  return !robots.includes('noindex');
}

/** Resolve the final title/description/canonical values for a page. */
export function resolveMeta(page, defaults = {}, origin = '') {
  const seo = page?.seo || {};
  const canonical = seo.canonicalUrl || absoluteUrl(origin, page?.route || '/');

  return {
    title: seo.seoTitle || defaults.defaultTitle || defaults.siteName || 'G3B Education',
    description: seo.metaDescription || defaults.defaultDescription || null,
    canonical,
    robots: seo.metaRobots || 'index,follow',
    ogTitle: seo.ogTitle || seo.seoTitle || defaults.defaultTitle || defaults.siteName || null,
    ogDescription: seo.ogDescription || seo.metaDescription || defaults.defaultDescription || null,
    ogImage: seo.ogImage || defaults.defaultImage || null,
    primaryKeyword: seo.primaryKeyword || null,
    structuredData: seo.structuredData || null,
  };
}

/** Render the `<head>` tags for a page as an HTML string. */
export function renderMetaTags(page, defaults = {}, origin = '') {
  const meta = resolveMeta(page, defaults, origin);
  const lines = [
    `<title>${escapeHtml(meta.title)}</title>`,
    meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}" />` : null,
    meta.primaryKeyword ? `<meta name="keywords" content="${escapeHtml(meta.primaryKeyword)}" />` : null,
    `<meta name="robots" content="${escapeHtml(meta.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:type" content="${page?.pageType === 'article' ? 'article' : 'website'}" />`,
    meta.ogTitle ? `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />` : null,
    meta.ogDescription
      ? `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`
      : null,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    meta.ogImage ? `<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />` : null,
    `<meta name="twitter:card" content="${meta.ogImage ? 'summary_large_image' : 'summary'}" />`,
    meta.ogTitle ? `<meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}" />` : null,
    meta.ogDescription
      ? `<meta name="twitter:description" content="${escapeHtml(meta.ogDescription)}" />`
      : null,
    meta.ogImage ? `<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />` : null,
  ].filter(Boolean);

  const jsonLd = buildJsonLd(page, defaults, origin);
  if (jsonLd) {
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    );
  }

  return lines.join('\n    ');
}

/**
 * Build JSON-LD from data that actually exists: the page's own structured data
 * plus a truthful WebSite/Organization node. Nothing is invented.
 */
export function buildJsonLd(page, defaults = {}, origin = '') {
  const nodes = [];
  const meta = resolveMeta(page, defaults, origin);

  nodes.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: defaults.siteName || 'G3B Education',
    url: `${origin}/`,
  });

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: defaults.siteName || 'G3B Education',
    url: `${origin}/`,
  };
  if (defaults.organizationLogo) organization.logo = defaults.organizationLogo;
  nodes.push(organization);

  if (meta.structuredData && typeof meta.structuredData === 'object') {
    nodes.push(meta.structuredData);
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

/** Replace the static head tags in the built `index.html` with live metadata. */
export function injectHead(html, tags) {
  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/?>/i, '');
  output = output.replace('</head>', `    ${tags}\n  </head>`);
  return output;
}

/** Build sitemap.xml from published, indexable pages. */
export function buildSitemapXml(pages, origin) {
  const urls = pages
    .filter((page) => isIndexable(page))
    .map((page) => {
      const loc = absoluteUrl(origin, page.route);
      const lastmod = page.updatedAt ? new Date(page.updatedAt).toISOString().slice(0, 10) : null;
      const priority = page.route === '/' ? '1.0' : '0.7';
      return [
        '  <url>',
        `    <loc>${escapeHtml(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Build robots.txt.
 *
 * The private admin path is disallowed here, but robots.txt is deliberately
 * *not* the security control: the admin area is protected by authentication,
 * server-side authorisation checks and `noindex` directives.
 */
export function buildRobotsTxt(origin, adminRoute = '/manage-portal') {
  return [
    '# Generated automatically from the published page registry.',
    '# robots.txt is not a security control - it only asks well-behaved crawlers to stay out.',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    `Disallow: ${adminRoute}`,
    `Disallow: ${adminRoute}/`,
    'Disallow: /uploads/tmp/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export default { renderMetaTags, buildSitemapXml, buildRobotsTxt, injectHead, resolveMeta, isIndexable };
