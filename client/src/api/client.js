import axios from 'axios'
import { notify } from './notifications.js'
function resolveBaseUrl() {
  const envUrl = (import.meta.env?.VITE_API_URL || '').trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  }
  return ''
}

export const baseURL = resolveBaseUrl()
const authListeners = new Set()
const refreshListeners = new Set()
const errorListeners = new Set()
const contentListeners = new Set()
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const AUTH_PATH = /\/api\/auth\/(?:login|logout|forgot-password|reset-password|refresh-token)(?:\?|$)/
const SESSION_PATH = /\/api\/auth\/(?:me|session)(?:\?|$)/

export const onAuthExpired = (listener) => subscribe(authListeners, listener)
export const onAuthRefreshed = (listener) => subscribe(refreshListeners, listener)
export const onApiError = (listener) => subscribe(errorListeners, listener)
export const onContentChanged = (listener) => subscribe(contentListeners, listener)

function subscribe(listeners, listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(listeners, value) {
  for (const listener of listeners) listener(value)
}

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1)
  try { return value ? decodeURIComponent(value) : null } catch { return null }
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `g3b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** A consistent error shape for inline feedback, notifications, and field errors. */
export function parseApiError(error) {
  const status = Number(error?.response?.status || 0)
  const data = error?.response?.data
  const cancelled = axios.isCancel(error) || error?.code === 'ERR_CANCELED'
  const timedOut = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'
  const defaults = {
    400: 'Please check the information you entered.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested item could not be found.',
    409: 'This information has changed. Please reload and try again.',
    422: 'Please check the information you entered.',
    429: 'Too many requests. Please wait a moment and try again.',
  }
  const backendMessage = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : null
  const message = cancelled ? 'Request cancelled.' : backendMessage || (timedOut
    ? 'The request timed out. Please try again.'
    : defaults[status] || (status >= 500
      ? 'The server could not complete your request. Please try again shortly.'
      : status === 0 ? 'Cannot reach the server. Please check your connection and try again.' : 'Something went wrong. Please try again.'))
  return {
    status,
    message,
    details: data?.details || data?.errors || null,
    requestId: error?.response?.headers?.['x-request-id'] || error?.config?.headers?.['X-Request-ID'] || null,
    cancelled,
    timedOut,
    retryAfter: error?.response?.headers?.['retry-after'] || null,
  }
}

/** null means the server asked us to wait longer than an interactive retry. */
export function getRetryDelay(error, retryCount, now = Date.now()) {
  const value = error?.response?.headers?.['retry-after']
  if (value !== undefined && value !== null && value !== '') {
    const seconds = Number(value)
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now
    if (Number.isFinite(delay)) return delay > 30000 ? null : Math.max(0, delay)
  }
  return Math.min(500 * (2 ** retryCount), 4000)
}

function waitWithSignal(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new axios.CanceledError())
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(new axios.CanceledError()) }
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => { signal.removeEventListener('abort', abort); resolve(value) },
      (error) => { signal.removeEventListener('abort', abort); reject(error) },
    )
  })
}

function delayWithSignal(milliseconds, signal) {
  if (signal?.aborted) return Promise.reject(new axios.CanceledError())
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new axios.CanceledError()) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, milliseconds)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Factory exported so transport behavior can be verified without a real server. */
export function createApiClient(options = {}) {
  let csrfToken = null
  let refreshPromise = null
  let refreshController = null
  let sessionVersion = 0
  let expired = false
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  function clearSession() {
    csrfToken = null
    expired = true
    sessionVersion += 1
    refreshController?.abort()
  }

  function expireSession(error) {
    if (expired) return
    expired = true
    clearSession()
    emit(authListeners, parseApiError(error))
  }

  instance.clearSession = clearSession
  instance.interceptors.request.use((config) => {
    config.headers['X-Request-ID'] ||= requestId()
    config._sessionVersion = sessionVersion
    if (MUTATING_METHODS.has((config.method || 'get').toLowerCase())) {
      const token = csrfToken || readCookie('g3b_csrf')
      if (token) config.headers['X-CSRF-Token'] = token
      else delete config.headers['X-CSRF-Token']
    }
    return config
  })

  instance.interceptors.response.use((response) => {
    const authData = response.data?.data
    const authResponse = /\/api\/auth\/(?:login|refresh-token)(?:\?|$)/.test(response.config.url || '')
    if (authData?.csrfToken && (authResponse || response.config._sessionVersion === sessionVersion)) csrfToken = authData.csrfToken
    if (authResponse) {
      sessionVersion += 1
      expired = false
    }
    if (SESSION_PATH.test(response.config.url || '') && authData?.user) expired = false
    if (MUTATING_METHODS.has(response.config.method?.toLowerCase()) && /\/api\/admin\//.test(response.config.url || '')) {
      emit(contentListeners)
    }
    return response
  }, async (error) => {
    const config = error.config
    if (!config || axios.isCancel(error) || config.signal?.aborted) return Promise.reject(error)
    const status = error.response?.status
    const path = config.url || ''
    const protectedRequest = path.includes('/api/admin/') || SESSION_PATH.test(path)

    if (status === 401 && protectedRequest && !expired && !config.skipAuthRefresh && !AUTH_PATH.test(path) && !config._authRetried) {
      config._authRetried = true
      try {
        // Reuse a refresh that completed while an older response was in flight.
        if (config._sessionVersion === sessionVersion) {
          if (!refreshPromise) {
            refreshController = new AbortController()
            refreshPromise = instance.post('/api/auth/refresh-token', null, {
              signal: refreshController.signal,
              skipAuthRefresh: true,
              notifyOnError: false,
              retry: false,
            }).then((response) => {
              emit(refreshListeners, response.data?.data?.user || null)
              return response
            }).finally(() => { refreshPromise = null; refreshController = null })
          }
          await waitWithSignal(refreshPromise, config.signal)
        }
        if (expired) return Promise.reject(error)
        return instance(config)
      } catch (refreshError) {
        if (config.signal?.aborted) return Promise.reject(new axios.CanceledError())
        // A temporary outage does not invalidate an otherwise valid session.
        if ([401, 403].includes(refreshError?.response?.status)) expireSession(refreshError)
        return Promise.reject(refreshError)
      }
    }

    const retryCount = config._retryCount || 0
    const transient = !error.response || status === 429 || status >= 500
    if (config.method?.toLowerCase() === 'get' && config.retry !== false && retryCount < 2 && transient) {
      const delay = getRetryDelay(error, retryCount)
      if (delay !== null) {
        config._retryCount = retryCount + 1
        await delayWithSignal(delay, config.signal)
        return instance(config)
      }
    }

    if (status === 401 && protectedRequest && config._authRetried) expireSession(error)
    const parsed = parseApiError(error)
    error.apiError = parsed
    emit(errorListeners, parsed)
    if (config.notifyOnError !== false && !AUTH_PATH.test(path) && !SESSION_PATH.test(path)) {
      notify({ type: 'error', message: parsed.message })
    }
    return Promise.reject(error)
  })
  return instance
}

export const api = createApiClient()
export const clearApiSession = () => api.clearSession()

/** Resolve stored upload paths against an optional separate API origin. */
export function resolveMediaUrl(url) {
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return url.startsWith('/') ? `${baseURL}${url}` : url
  try {
    const parsed = new URL(url)
    if (/(^|\.)localhost$/.test(parsed.hostname) || parsed.hostname === '127.0.0.1') {
      return `${baseURL}${parsed.pathname}${parsed.search}`
    }
  } catch { return url }
  return url
}

export default api
