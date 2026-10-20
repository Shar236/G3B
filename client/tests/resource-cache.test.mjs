import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { createResourceCache } from '../src/api/resourceCache.js'

test('multiple subscribers share a request and reuse fresh data', async () => {
  let calls = 0
  const cache = createResourceCache(async () => { calls += 1; await delay(5); return { title: 'G3B' } })
  const first = cache.load()
  const second = cache.load()
  assert.equal(first, second)
  await Promise.all([first, second])
  await cache.load()
  assert.equal(calls, 1)
  assert.equal(cache.getSnapshot().loading, false)
  assert.equal(cache.getSnapshot().data.title, 'G3B')
})

test('failed resources expose a recoverable error and retry clears it', async () => {
  let calls = 0
  const cache = createResourceCache(async () => {
    if (++calls === 1) throw new Error('Offline')
    return 'Recovered'
  }, { parseError: (error) => ({ message: error.message }) })
  await cache.load()
  assert.equal(cache.getSnapshot().error.message, 'Offline')
  assert.equal(cache.getSnapshot().loading, false)
  await cache.load({ force: true })
  assert.equal(cache.getSnapshot().data, 'Recovered')
  assert.equal(cache.getSnapshot().error, null)
})

test('invalidating a pending request aborts it and publishes only the newest response', async () => {
  let calls = 0
  let aborted = false
  const cache = createResourceCache(async ({ signal }) => {
    const version = ++calls
    signal.addEventListener('abort', () => { aborted = true }, { once: true })
    await delay(10)
    return version
  })
  const stop = cache.subscribe(() => {})
  const first = cache.load()
  await delay(1)
  cache.invalidate()
  await first
  await cache.load()
  assert.equal(aborted, true)
  assert.equal(cache.getSnapshot().data, 2)
  assert.equal(calls, 2)
  stop()
})

test('invalidating an inactive cache defers the refresh until the next consumer', async () => {
  let calls = 0
  const cache = createResourceCache(async () => ++calls)
  await cache.load()
  cache.invalidate()
  assert.equal(calls, 1)
  await cache.load()
  assert.equal(cache.getSnapshot().data, 2)
})
