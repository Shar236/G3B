import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import axios, { AxiosError } from 'axios'
import { createApiClient, getRetryDelay, onAuthExpired, parseApiError, resolveMediaUrl } from '../src/api/client.js'

test('bundled assets stay on the frontend origin while uploaded media uses the API origin', () => {
  assert.equal(resolveMediaUrl('/images/services-campus.jpg'), '/images/services-campus.jpg')
  assert.equal(resolveMediaUrl('/logo.png'), '/logo.png')
  assert.equal(resolveMediaUrl('http://localhost:5000/images/services-uk.jpg'), '/images/services-uk.jpg')
  assert.ok(resolveMediaUrl('/uploads/photo.webp').endsWith('/uploads/photo.webp'))
  assert.equal(resolveMediaUrl('https://example.com/photo.webp'), 'https://example.com/photo.webp')
})

const reply = (config, data = {}, status = 200) => ({ config, status, data, headers: {}, statusText: String(status) })
const refusal = (config, status, data = {}, headers = {}) => new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, { ...reply(config, data, status), headers })

test('requests use cookies, timeout, tracking IDs, caller cancellation and CSRF from the API response', async () => {
  const requests = []
  const client = createApiClient({ adapter: async (config) => {
    requests.push(config)
    return reply(config, { data: { csrfToken: 'csrf-from-api-origin', user: { id: 1 } } })
  } })
  await client.post('/api/auth/login', { email: 'admin@example.com', password: 'example' })
  const controller = new AbortController()
  await client.patch('/api/admin/enquiries/1', { status: 'contacted' }, { signal: controller.signal })
  assert.equal(requests[1].timeout, 15000)
  assert.equal(requests[1].withCredentials, true)
  assert.equal(requests[1].signal, controller.signal)
  assert.equal(requests[1].headers['X-CSRF-Token'], 'csrf-from-api-origin')
  assert.ok(requests[1].headers['X-Request-ID'])
  assert.equal(requests[1].headers.Authorization, undefined)
})

test('simultaneous expired requests share one refresh, then replay with the new CSRF token', async () => {
  let refreshed = false
  let refreshes = 0
  const client = createApiClient({ adapter: async (config) => {
    if (config.url === '/api/auth/refresh-token') {
      refreshes += 1
      await delay(15)
      refreshed = true
      return reply(config, { data: { csrfToken: 'rotated-csrf', user: { id: 1 } } })
    }
    if (!refreshed) throw refusal(config, 401)
    if (config.method === 'patch') assert.equal(config.headers['X-CSRF-Token'], 'rotated-csrf')
    return reply(config, { ok: true })
  } })
  const results = await Promise.all([
    client.get('/api/admin/enquiries', { notifyOnError: false }),
    client.patch('/api/admin/enquiries/1', { status: 'contacted' }, { notifyOnError: false }),
  ])
  assert.equal(refreshes, 1)
  assert.ok(results.every((result) => result.data.ok))
})

test('a late 401 from an old access token reuses a refresh that already finished', async () => {
  let refreshes = 0
  const client = createApiClient({ adapter: async (config) => {
    if (config.url === '/api/auth/refresh-token') {
      refreshes += 1
      return reply(config, { data: { user: { id: 1 }, csrfToken: 'new-csrf' } })
    }
    if (!config._authRetried) {
      if (config.url.endsWith('/slow')) await delay(20)
      throw refusal(config, 401)
    }
    return reply(config)
  } })
  await Promise.all([client.get('/api/admin/fast'), client.get('/api/admin/slow')])
  assert.equal(refreshes, 1)
})

test('refresh refusal clears authentication once for the entire queue', async () => {
  let expired = 0
  let refreshes = 0
  const stop = onAuthExpired(() => { expired += 1 })
  try {
    const client = createApiClient({ adapter: async (config) => {
      if (config.url === '/api/auth/refresh-token') { refreshes += 1; await delay(10) }
      throw refusal(config, 401, { error: 'Session expired.' })
    } })
    const results = await Promise.allSettled([client.get('/api/admin/a'), client.get('/api/admin/b')])
    assert.ok(results.every((result) => result.status === 'rejected'))
    assert.equal(refreshes, 1)
    assert.equal(expired, 1)
    await assert.rejects(client.get('/api/admin/c', { notifyOnError: false }))
    assert.equal(refreshes, 1)
  } finally { stop() }
})

test('a temporary refresh outage does not sign the user out or retry a mutation', async () => {
  let expired = 0
  let refreshes = 0
  const stop = onAuthExpired(() => { expired += 1 })
  try {
    const client = createApiClient({ adapter: async (config) => {
      if (config.url === '/api/auth/refresh-token') { refreshes += 1; throw refusal(config, 503) }
      throw refusal(config, 401)
    } })
    await assert.rejects(client.patch('/api/admin/enquiries/1', {}, { notifyOnError: false }), (error) => error.response.status === 503)
    assert.equal(refreshes, 1)
    assert.equal(expired, 0)
  } finally { stop() }
})

test('GET transient errors retry at most twice; writes never automatically retry', async () => {
  let attempts = 0
  const client = createApiClient({ adapter: async (config) => {
    attempts += 1
    throw refusal(config, 503, {}, { 'retry-after': '0' })
  } })
  await assert.rejects(client.get('/api/home', { notifyOnError: false }))
  assert.equal(attempts, 3)
  attempts = 0
  await assert.rejects(client.post('/api/enquiries', {}, { notifyOnError: false }))
  assert.equal(attempts, 1)
})

test('GET network errors recover within the bounded retry budget', async () => {
  let attempts = 0
  const client = createApiClient({ adapter: async (config) => {
    attempts += 1
    if (attempts < 3) throw new AxiosError('Network Error', 'ERR_NETWORK', config, {})
    return reply(config, { recovered: true })
  } })
  assert.equal((await client.get('/api/home')).data.recovered, true)
  assert.equal(attempts, 3)
})

test('cancelling a backoff stops the timer and prevents another network attempt', async () => {
  let attempts = 0
  const controller = new AbortController()
  const client = createApiClient({ adapter: async (config) => {
    attempts += 1
    throw refusal(config, 429, {}, { 'retry-after': '30' })
  } })
  const request = client.get('/api/home', { signal: controller.signal, notifyOnError: false })
  setTimeout(() => controller.abort(), 10)
  await assert.rejects(request, (error) => axios.isCancel(error))
  assert.equal(attempts, 1)
})

test('cancelling one refresh waiter preserves the shared refresh for other callers', async () => {
  const controller = new AbortController()
  let refreshes = 0
  const client = createApiClient({ adapter: async (config) => {
    if (config.url === '/api/auth/refresh-token') { refreshes += 1; await delay(30); return reply(config, { data: { user: { id: 1 } } }) }
    if (!config._authRetried) throw refusal(config, 401)
    return reply(config)
  } })
  const cancelled = client.get('/api/admin/a', { signal: controller.signal })
  const remaining = client.get('/api/admin/b')
  setTimeout(() => controller.abort(), 10)
  await assert.rejects(cancelled, (error) => axios.isCancel(error))
  assert.equal((await remaining).status, 200)
  assert.equal(refreshes, 1)
})

test('validation and login errors never retry or attempt a refresh', async () => {
  const requests = []
  const client = createApiClient({ adapter: async (config) => {
    requests.push(config.url)
    throw refusal(config, config.url.includes('login') ? 401 : 400)
  } })
  await assert.rejects(client.get('/api/home', { notifyOnError: false }))
  await assert.rejects(client.post('/api/auth/login', {}))
  assert.deepEqual(requests, ['/api/home', '/api/auth/login'])
})

test('Retry-After supports seconds and HTTP dates without retrying too early', () => {
  const at = Date.parse('2026-10-20T00:00:00Z')
  assert.equal(getRetryDelay({ response: { headers: { 'retry-after': '5' } } }, 0, at), 5000)
  assert.equal(getRetryDelay({ response: { headers: { 'retry-after': 'Tue, 20 Oct 2026 00:00:10 GMT' } } }, 0, at), 10000)
  assert.equal(getRetryDelay({ response: { headers: { 'retry-after': '120' } } }, 0, at), null)
  assert.equal(getRetryDelay({}, 0), 500)
  assert.equal(getRetryDelay({}, 1), 1000)
})

test('normalization keeps backend field details and distinguishes timeout and cancellation', () => {
  const details = [{ field: 'email', message: 'Enter a valid email.' }]
  const parsed = parseApiError({ response: { status: 400, data: { error: 'Please check email.', details }, headers: { 'x-request-id': 'request-1' } } })
  assert.equal(parsed.message, 'Please check email.')
  assert.equal(parsed.details, details)
  assert.equal(parsed.requestId, 'request-1')
  assert.equal(parseApiError({ code: 'ECONNABORTED' }).timedOut, true)
  assert.equal(parseApiError(new axios.CanceledError()).cancelled, true)
})
