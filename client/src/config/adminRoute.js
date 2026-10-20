/**
 * Base path for the private administration area.
 *
 * Configure with the `VITE_ADMIN_ROUTE` environment variable so the same build
 * can be deployed with a different private path per environment.
 *
 * IMPORTANT: an unlisted URL is NOT a security mechanism. The admin area is
 * protected server-side by session authentication, role checks, CSRF
 * validation and rate limiting. This path is only kept out of the public
 * navigation, footer, sitemap and robots.txt to reduce noise.
 */
const configured = import.meta.env.VITE_ADMIN_ROUTE || '/manage-portal'

/** Normalised base path, always with a single leading slash and no trailing slash. */
export const ADMIN_BASE = `/${String(configured).replace(/^\/+|\/+$/g, '')}`

/** Build an absolute in-app path inside the admin area. */
export function adminPath(sub = '') {
  const clean = String(sub).replace(/^\/+/, '')
  return clean ? `${ADMIN_BASE}/${clean}` : ADMIN_BASE
}

export default ADMIN_BASE
