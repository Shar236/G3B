import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import useDocumentMeta from './useDocumentMeta.js'

/** Absolute URL for a route, using the browser's own origin. */
function browserUrl(route) {
  if (typeof window === 'undefined') return undefined
  const clean = route && route !== '/' ? route : '/'
  return `${window.location.origin}${clean}`
}

/**
 * Apply the metadata published in the admin SEO manager to the current page.
 *
 * The values come from the database (`GET /api/seo/page?route=...`) so editing
 * a title in the dashboard changes what visitors see. The hard-coded values are
 * used only as a fallback when the route is not registered, or while the
 * request is in flight - which is also what the server renders into the HTML
 * before React hydrates.
 *
 * @param {string} route           Public route, e.g. '/' or '/services'.
 * @param {object} fallback        Hard-coded defaults for that route.
 */
export function usePageSeo(route, fallback = {}) {
  const [remote, setRemote] = useState(null)

  useEffect(() => {
    if (!route) return undefined
    const controller = new AbortController()

    api
      .get('/api/seo/page', { params: { route }, signal: controller.signal, notifyOnError: false })
      .then((response) => {
        if (!controller.signal.aborted) setRemote({ route, data: response.data?.data || null })
      })
      .catch(() => {
        // No published metadata for this route: keep the defaults.
        if (!controller.signal.aborted) setRemote({ route, data: null })
      })

    return () => {
      controller.abort()
    }
  }, [route])

  const published = remote?.route === route ? remote.data : null
  const seo = published?.seo || null
  // An explicit canonical is an override (e.g. a duplicate page pointing at the
  // original); otherwise the canonical is simply this page's own URL.
  const canonical = seo?.canonicalUrl || browserUrl(route) || fallback.canonical

  useDocumentMeta({
    title: seo?.seoTitle || fallback.title,
    description: seo?.metaDescription || fallback.description,
    keywords: seo?.primaryKeyword || fallback.keywords,
    canonical,
    image: seo?.ogImage || fallback.image,
    robots: seo?.metaRobots || fallback.robots,
    jsonLd: seo?.structuredData || fallback.jsonLd,
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
  })

  // Expose the published content so pages can render editable headings/copy.
  return published
}

export default usePageSeo
