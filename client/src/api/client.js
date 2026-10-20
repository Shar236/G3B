import axios from 'axios'

/**
 * Base URL for the API.
 * - Development: empty string so Vite's proxy forwards `/api` to Express.
 * - Production: set VITE_API_URL (e.g. https://api.g3beducation.com).
 */
const baseURL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Double-submit CSRF: echo the readable cookie back in a header for writes.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = readCookie('g3b_csrf')
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

/** Normalise an axios error into a predictable shape for the UI. */
export function parseApiError(error) {
  if (error?.response) {
    const { status, data } = error.response
    return {
      status,
      message: data?.error || data?.message || 'Something went wrong. Please try again.',
      details: data?.details || null,
    }
  }
  if (error?.request) {
    return { status: 0, message: 'Cannot reach the server. Please check your connection and try again.', details: null }
  }
  return { status: 0, message: error?.message || 'Unexpected error.', details: null }
}

/** Turn an absolute upload URL into a path the browser can load in any environment. */
export function resolveMediaUrl(url) {
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return url.startsWith('/') ? `${baseURL}${url}` : url
  // Rewrite localhost backend URLs so they work through the dev proxy / prod domain.
  try {
    const parsed = new URL(url)
    if (/(^|\.)localhost$/.test(parsed.hostname) || parsed.hostname === '127.0.0.1') {
      return `${baseURL}${parsed.pathname}`
    }
  } catch {
    return url
  }
  return url
}

export default api
