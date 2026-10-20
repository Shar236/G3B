import { insights } from '../../../client/src/data/insights.js';
import { pagesRepository } from '../repositories/pagesRepository.js';

// Use the public article source directly so crawler content and the React page
// stay identical. The full repository is deployed together with client/dist.
const insightDescription = 'Explore G3B Education insights on study abroad, career assessments and scholarship planning.';
const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function page(route, name, description, pageType, extra = {}) {
  return {
    id: null, route, name, pageType, status: 'published', isIndexable: true, sections: [],
    updatedAt: insights[0]?.date,
    seo: { seoTitle: `${name} | G3B Education`, metaDescription: description, metaRobots: 'index,follow', ...extra },
  };
}

export const builtInPages = [
  page('/insights', 'Study Abroad Insights', insightDescription, 'blog'),
  ...insights.map((article) => page(`/insights/${article.slug}`, article.title, article.excerpt, 'article', {
    structuredData: {
      '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
      description: article.excerpt, datePublished: article.date, dateModified: article.date,
      author: { '@type': 'Organization', name: 'G3B Education' },
    },
  })),
  { ...page('/unsubscribe', 'Newsletter preferences', 'Manage your G3B Education newsletter subscription.', 'custom', { metaRobots: 'noindex,nofollow' }), isIndexable: false },
];

export function withBuiltInDefaults(registered) {
  const fallback = builtInPages.find((item) => item.route === registered.route);
  if (!fallback) return registered;
  return {
    ...fallback, ...registered,
    seo: { ...fallback.seo, ...Object.fromEntries(Object.entries(registered.seo || {}).filter(([, value]) => value !== null && value !== undefined && value !== '')) },
  };
}

/** Explicit CMS drafts suppress defaults; published metadata takes precedence. */
export function mergePublicPages(registered) {
  const routes = new Set(registered.map((item) => item.route));
  return [
    ...registered.filter((item) => item.status === 'published').map(withBuiltInDefaults),
    ...builtInPages.filter((item) => !routes.has(item.route)),
  ];
}

export async function listPublicPagesWithDefaults() {
  return mergePublicPages(await pagesRepository.list());
}

export async function findPublicPageWithDefaults(route) {
  const published = await pagesRepository.findPublishedByRoute(route);
  if (published) return withBuiltInDefaults(published);
  const fallback = builtInPages.find((item) => item.route === route);
  if (!fallback || await pagesRepository.findRouteOwner(route)) return null;
  return fallback;
}

/** Render actual article copy into the root React replaces on startup. */
export function renderBuiltInBody(route) {
  if (route === '/insights') {
    return `<main class="section"><div class="container article-container"><h1>Study Abroad Insights</h1><p>${insightDescription}</p>${insights.map((article) => `<article><h2><a href="/insights/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.excerpt)}</p></article>`).join('')}</div></main>`;
  }
  const article = insights.find((item) => route === `/insights/${item.slug}`);
  if (!article) return '';
  const sources = article.sources.length ? `<aside><h2>Official sources</h2><ul>${article.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join('')}</ul></aside>` : '';
  return `<main class="section article-page"><article class="container article-container"><a href="/insights">All insights</a><header><p>${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.excerpt)}</p><p>G3B Education · <time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></p></header><div class="article-copy">${article.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.text)}</p></section>`).join('')}${sources}</div></article></main>`;
}

export function injectBuiltInBody(html, route) {
  const content = renderBuiltInBody(route);
  return content ? html.replace(/(<div\b[^>]*\bid=["']root["'][^>]*>)[\s\S]*?(<\/div>)/i, (_match, open, close) => `${open}${content}${close}`) : html;
}
