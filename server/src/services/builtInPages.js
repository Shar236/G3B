import { insights } from '../data/insights.js';
import { visibleHomepageSections } from '../../../shared/publicContentPolicy.js';
import { pagesRepository } from '../repositories/pagesRepository.js';
import studyAbroadRepository from '../repositories/studyAbroadRepository.js';
import { servicesRepository } from '../repositories/catalogRepository.js';

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
  page('/assessments', 'Career & Student Assessments', 'Explore guided student, professional, aptitude and personality assessments with G3B Education.', 'custom'),
  page('/services/india-admissions', 'India Admissions', 'College and university selection, eligibility, applications and document guidance for studying in India.', 'service'),
  page('/study-abroad/my-dream-college', 'Find Your Dream University Abroad', 'Explore G3B Education’s administrator-verified university catalogue and build a shortlist for your study abroad plan.', 'custom'),
  page('/study-abroad/my-dream-program', 'Discover a Program That Matches Your Ambition', 'Search and compare administrator-verified international study programs with G3B Education.', 'custom'),
  page(
    '/partner-with-us',
    'Partner With G3B Education',
    'Join G3B Education in helping students make informed decisions about their academic and international education journeys. Connect with us to explore meaningful collaboration opportunities.',
    'custom',
    {
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Partner With G3B Education',
        description: 'Join G3B Education in helping students make informed decisions about their academic and international education journeys. Connect with us to explore meaningful collaboration opportunities.',
        publisher: {
          '@type': 'EducationalOrganization',
          name: 'G3B Education',
        },
      },
    },
  ),
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
  const unique = [...new Map(registered.map((item) => [item.route, item])).values()];
  const routes = new Set(unique.map((item) => item.route));
  return [
    ...unique.filter((item) => item.status === 'published').map(withBuiltInDefaults),
    ...builtInPages.filter((item) => !routes.has(item.route)),
  ];
}

export async function listPublicPagesWithDefaults() {
  const [registered, universities, programs, services] = await Promise.all([
    pagesRepository.list(), studyAbroadRepository.universities({ perPage: 100 }), studyAbroadRepository.programs({ perPage: 100 }), servicesRepository.list({ activeOnly: true }),
  ]);
  const dynamic = [
    ...services.filter((item) => item.slug).map((item) => page(`/services/${item.slug}`, item.title, item.description || item.subtitle || item.title, 'service')),
    ...universities.items.map((item) => page(`/study-abroad/universities/${item.slug}`, item.name, item.overview || `Review verified university information for ${item.name}.`, 'custom')),
    ...programs.items.map((item) => page(`/study-abroad/programs/${item.slug}`, item.name, item.overview || `Review verified program information for ${item.name}.`, 'custom')),
  ];
  const registeredRoutes = new Set(registered.map((item) => item.route));
  return mergePublicPages([...registered, ...dynamic.filter((item) => !registeredRoutes.has(item.route))]);
}

export async function findPublicPageWithDefaults(route) {
  const published = await pagesRepository.findPublishedByRoute(route);
  if (published) return withBuiltInDefaults(published);
  const fallback = builtInPages.find((item) => item.route === route);
  if (fallback) return await pagesRepository.findRouteOwner(route) ? null : fallback;
  const serviceSlug = route.match(/^\/services\/([^/]+)$/)?.[1];
  if (serviceSlug) {
    const service = (await servicesRepository.list({ activeOnly: true })).find((item) => item.slug === serviceSlug);
    return service ? page(route, service.title, service.description || service.subtitle || service.title, 'service') : null;
  }
  const universitySlug = route.match(/^\/study-abroad\/universities\/([^/]+)$/)?.[1];
  if (universitySlug) {
    const item = await studyAbroadRepository.university(universitySlug);
    return item ? page(route, item.name, item.overview || `Review verified university information for ${item.name}.`, 'custom') : null;
  }
  const programSlug = route.match(/^\/study-abroad\/programs\/([^/]+)$/)?.[1];
  if (programSlug) {
    const item = await studyAbroadRepository.program(programSlug);
    return item ? page(route, item.name, item.overview || `Review verified program information for ${item.name}.`, 'custom') : null;
  }
  return null;
}

/** Render actual article copy into the root React replaces on startup. */
export function renderBuiltInBody(route) {
  const landing = builtInPages.find((item) => item.route === route && ['/assessments','/study-abroad/my-dream-college','/study-abroad/my-dream-program'].includes(route));
  if (landing) return `<main class="section"><div class="container article-container"><h1>${escapeHtml(landing.name)}</h1><p>${escapeHtml(landing.seo.metaDescription)}</p></div></main>`;
  if (route === '/insights') {
    return `<main class="section"><div class="container article-container"><h1>Study Abroad Insights</h1><p>${insightDescription}</p>${insights.map((article) => `<article><h2><a href="/insights/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.excerpt)}</p></article>`).join('')}</div></main>`;
  }
  const article = insights.find((item) => route === `/insights/${item.slug}`);
  if (!article) return '';
  const sources = article.sources.length ? `<aside><h2>Official sources</h2><ul>${article.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join('')}</ul></aside>` : '';
  return `<main class="section article-page"><article class="container article-container"><a href="/insights">All insights</a><header><p>${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.excerpt)}</p><p>G3B Education · <time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></p></header><div class="article-copy">${article.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.text)}</p></section>`).join('')}${sources}</div></article></main>`;
}

export function renderManagedBody(page) {
  if (page?.template !== 'managed') return '';
  const sections = (page.route === '/' ? visibleHomepageSections(page.sections || []) : page.sections || []).filter((section) => section.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  const hasH1 = sections.some((section) => section.headingLevel === 'h1');
  const intro = hasH1 ? '' : `<h1>${escapeHtml(page.name)}</h1>`;
  return `<main class="section"><div class="container article-container">${intro}${sections.map((section) => {
    const level = ['h1', 'h2', 'h3', 'h4'].includes(section.headingLevel) ? section.headingLevel : 'h2';
    const heading = section.headingText ? `<${level}>${escapeHtml(section.headingText)}</${level}>` : '';
    const description = section.description ? `<p>${escapeHtml(section.description)}</p>` : '';
    const image = section.imageUrl && /^\/|^https:\/\//i.test(section.imageUrl) ? `<img src="${escapeHtml(section.imageUrl)}" alt="${escapeHtml(section.imageAlt)}" loading="lazy" width="720" height="480" />` : '';
    const link = section.ctaUrl && (/^\/|^#|^https:\/\//i.test(section.ctaUrl)) ? `<a href="${escapeHtml(section.ctaUrl)}">${escapeHtml(section.ctaLabel || 'Learn more')}</a>` : '';
    return `<section>${heading}${description}${image}${link}</section>`;
  }).join('')}</div></main>`;
}

export function injectBuiltInBody(html, route, page = null) {
  const content = renderManagedBody(page) || renderBuiltInBody(route);
  return content ? html.replace(/(<div\b[^>]*\bid=["']root["'][^>]*>)[\s\S]*?(<\/div>)/i, (_match, open, close) => `${open}${content}${close}`) : html;
}
