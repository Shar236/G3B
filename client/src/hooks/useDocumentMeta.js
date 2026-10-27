import { useEffect } from 'react'

const MANAGED = 'data-g3b-managed'

function upsertMeta(attr, key, content, managed = true) {
  const selector = `meta[${attr}="${key}"]`
  let tag = document.head.querySelector(selector)

  // Never overwrite a tag another tool owns, and never leave stale content.
  if (!content) {
    if (tag && managed && tag.getAttribute(MANAGED) === 'true') tag.remove()
    return
  }

  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  if (managed) tag.setAttribute(MANAGED, 'true')
  tag.setAttribute('content', content)
}

function upsertLink(rel, href) {
  const selector = `link[rel="${rel}"]`
  let tag = document.head.querySelector(selector)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute(MANAGED, 'true')
  tag.setAttribute('href', href)
}

function upsertJsonLd(jsonLd) {
  const id = 'g3b-structured-data'
  const existing = document.getElementById(id)
  if (!jsonLd) {
    if (existing) existing.remove()
    return
  }
  const tag = existing || document.createElement('script')
  tag.id = id
  tag.type = 'application/ld+json'
  tag.textContent = JSON.stringify(jsonLd)
  if (!existing) document.head.appendChild(tag)
}

/**
 * Apply per-page SEO metadata to the document head for client-side navigation.
 *
 * The server also injects these tags into the served HTML so crawlers and
 * social previews see them without executing JavaScript. This hook keeps the
 * head correct while the visitor navigates within the single-page app.
 *
 * @param {object}   options
 * @param {string}   options.title        Document title / <title> tag.
 * @param {string}   options.description  Meta description.
 * @param {string}   options.keywords     Meta keywords.
 * @param {string}   options.canonical    Absolute canonical URL.
 * @param {string}   options.image        Absolute Open Graph / Twitter image URL.
 * @param {string}   options.robots       Meta robots directive, e.g. 'noindex,nofollow'.
 * @param {object}   options.jsonLd       Structured data object rendered as JSON-LD.
 */
export function useDocumentMeta({
  title,
  description,
  keywords,
  canonical,
  image,
  robots,
  jsonLd,
  ogTitle,
  ogDescription,
} = {}) {
  useEffect(() => {
    if (title) document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', keywords)
    upsertMeta('name', 'robots', robots)

    const url = canonical || (typeof window !== 'undefined' ? window.location.href : '')
    if (url) upsertLink('canonical', url)

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', ogTitle || title)
    upsertMeta('property', 'og:description', ogDescription || description)
    if (url) upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', image)

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', ogTitle || title)
    upsertMeta('name', 'twitter:description', ogDescription || description)
    upsertMeta('name', 'twitter:image', image)

    upsertJsonLd(jsonLd)
  }, [title, description, keywords, canonical, image, robots, jsonLd, ogTitle, ogDescription])
}

export default useDocumentMeta
