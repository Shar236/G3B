import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { AxiosError } from 'axios'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { canConfirmShort, isYoutubeRegistrationUrl, shortsRegistryState } from '../src/pages/admin/youtubeShortsTools.js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'MutationObserver', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { createElement: h } = await import('react')
const { render, cleanup, screen, within, waitFor, fireEvent } = await import('@testing-library/react')
const { default: userEvent } = await import('@testing-library/user-event')
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, plugins: [react()], server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
const [{ default: Videos }, { default: api }] = await Promise.all([vite.ssrLoadModule('/src/pages/admin/Videos.jsx'), vite.ssrLoadModule('/src/api/client.js')])
const reply = (config, data) => ({ config, status: 200, statusText: 'OK', data: { success: true, data }, headers: {} })
const baseStatus = { configured: false, channelHandle: '@g3beducation_nerul', channelId: null, lastAttemptAt: null, lastSuccessAt: null, lastError: null, running: false, intervalMinutes: 360, counts: { candidates: 0, published: 0, pending: 0, excluded: 0, unavailable: 0 } }
const candidate = (id, extra = {}) => ({ id, youtubeId: `VID${String(id).padStart(8, '0')}`, title: `Actual channel video ${id}`, channelVerified: true, verifiedShort: false, availability: 'available', excluded: false, category: '', isActive: false, ...extra })
let status
let registry
let catalog
let failSync
let mutationGate
const requests = []

beforeEach(() => {
  status = structuredClone(baseStatus)
  registry = []
  catalog = []
  failSync = false
  mutationGate = null
  requests.length = 0
  api.defaults.adapter = async (config) => {
    const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    requests.push({ config, payload })
    if (config.method === 'get') return reply(config, config.url.endsWith('/status') ? status : config.url.endsWith('/youtube-shorts') ? registry : catalog)
    if (mutationGate) await mutationGate
    if (config.url.endsWith('/sync')) {
      if (failSync) throw new AxiosError('Synchronization rejected', 'ERR_BAD_RESPONSE', config, {}, { ...reply(config, null), status: 400, data: { error: 'YouTube API quota exceeded. Try again later.' } })
      return reply(config, { status, result: { imported: registry.length } })
    }
    if (config.method === 'post') { registry = [...registry, candidate(1, { title: null, channelVerified: false, availability: 'pending' })]; return reply(config, registry[0]) }
    const id = Number(config.url.split('/').at(-1))
    registry = registry.map((item) => item.id === id ? { ...item, ...(config.method === 'delete' ? { excluded: true } : payload) } : item)
    return reply(config, registry.find((item) => item.id === id))
  }
})
afterEach(cleanup)
after(async () => { await vite.close(); dom.window.close() })

const renderManager = async () => {
  render(h(Videos))
  await screen.findByText('Last attempt: Never')
  return userEvent.setup()
}

test('registry URL validation accepts official video URLs and rejects misleading or unsupported inputs', () => {
  for (const url of ['https://www.youtube.com/shorts/abcdefghijk', 'https://youtube.com/watch?v=abcdefghijk', 'https://youtu.be/abcdefghijk?si=share', 'https://m.youtube.com/shorts/abcdefghijk']) assert.equal(isYoutubeRegistrationUrl(url), true, url)
  for (const url of ['https://youtube.com.attacker.test/shorts/abcdefghijk', 'https://user:password@youtube.com/shorts/abcdefghijk', 'https://youtu.be/abcdefghijk/extra', 'https://youtube.com/shorts/too-short', 'javascript:alert(1)', 'https://vimeo.com/1234567', 'https://youtube.com:1234/watch?v=abcdefghijk']) assert.equal(isYoutubeRegistrationUrl(url), false, url)
  assert.equal(canConfirmShort(candidate(1)), true)
  for (const patch of [{ channelVerified: false }, { verifiedShort: true }, { availability: 'embedding_disabled' }, { excluded: true }]) assert.equal(canConfirmShort(candidate(1, patch)), false)
  assert.equal(shortsRegistryState(candidate(1, { channelVerified: false })).filter, 'pending')
})

test('missing configuration is explicit and saved links cannot publish before channel verification', async () => {
  const user = await renderManager()
  assert.match(screen.getByText(/Automatic import is not configured/).textContent, /YOUTUBE_API_KEY/)
  assert.equal(screen.getByRole('button', { name: 'Synchronize channel' }).disabled, true)
  assert.equal(screen.queryByRole('button', { name: 'Add video' }), null)
  await user.type(screen.getByLabelText('Add a YouTube Shorts URL'), 'https://www.youtube.com/shorts/abcdefghijk')
  await user.click(screen.getByRole('button', { name: 'Register URL' }))
  await screen.findByText('Awaiting channel verification')
  assert.equal(screen.queryByRole('button', { name: 'Confirm Short' }), null)
  assert.deepEqual(requests.find(({ config }) => config.method === 'post').payload, { url: 'https://www.youtube.com/shorts/abcdefghijk' })
  assert.match(screen.getByText(/Video URL registered/).textContent, /required before publication/)
})

test('manual registration rejects lookalike hosts before any backend mutation', async () => {
  const user = await renderManager()
  await user.type(screen.getByLabelText('Add a YouTube Shorts URL'), 'https://youtube.com.attacker.test/shorts/abcdefghijk')
  await user.click(screen.getByRole('button', { name: 'Register URL' }))
  assert.match(screen.getByRole('alert').textContent, /official YouTube/)
  assert.equal(requests.some(({ config }) => config.method === 'post'), false)
})

test('synchronous repeated registration submits produce one backend mutation', async () => {
  const user = await renderManager()
  await user.type(screen.getByLabelText('Add a YouTube Shorts URL'), 'https://www.youtube.com/shorts/abcdefghijk')
  let release
  mutationGate = new Promise((resolve) => { release = resolve })
  const form = screen.getByLabelText('Add a YouTube Shorts URL').closest('form')
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => assert.equal(requests.filter(({ config }) => config.method === 'post').length, 1))
  release()
  await screen.findByText('Awaiting channel verification')
  assert.equal(requests.filter(({ config }) => config.method === 'post').length, 1)
})

test('channel verified candidates require explicit Shorts confirmation and an administrator-selected category', async () => {
  status.configured = true
  registry = [candidate(1), candidate(2, { channelVerified: false }), candidate(3, { availability: 'embedding_disabled' })]
  const user = await renderManager()
  assert.equal(screen.getAllByRole('button', { name: 'Confirm Short' }).length, 1)
  await user.click(screen.getByRole('button', { name: 'Confirm Short' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirm channel Short' })
  assert.equal(within(dialog).getByLabelText('Testimonial category').value, '')
  assert.equal(within(dialog).getByRole('button', { name: 'Confirm and publish Short' }).disabled, true)
  await user.selectOptions(within(dialog).getByLabelText('Testimonial category'), 'Student Review')
  await user.click(within(dialog).getByRole('checkbox', { name: /I checked/ }))
  await user.click(within(dialog).getByRole('button', { name: 'Confirm and publish Short' }))
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null))
  const request = requests.find(({ config }) => config.method === 'patch')
  assert.equal(request.config.url, '/api/admin/youtube-shorts/1')
  assert.deepEqual(request.payload, { verifiedShort: true, title: 'Actual channel video 1', category: 'Student Review' })
  assert.match(screen.getByText(/Short confirmed/).textContent, /display order and visibility/)
})

test('all registry pages are accessible and review filters include excluded and unavailable states', async () => {
  registry = Array.from({ length: 24 }, (_, index) => candidate(index + 1))
  registry.push(candidate(25, { excluded: true }), candidate(26, { availability: 'unavailable' }))
  const user = await renderManager()
  assert.equal(screen.queryByText('Actual channel video 24'), null)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  assert.ok(screen.getByText('Actual channel video 24'))
  await user.selectOptions(screen.getByLabelText('Filter channel review status'), 'excluded')
  assert.ok(screen.getByText('Actual channel video 25'))
  assert.equal(screen.queryByRole('button', { name: 'Exclude' }), null)
  await user.selectOptions(screen.getByLabelText('Filter channel review status'), 'unavailable')
  assert.ok(screen.getByText('Unavailable on YouTube'))
  assert.equal(screen.queryByRole('button', { name: 'Confirm Short' }), null)
})

test('sync failures preserve the catalog and show actionable backend feedback', async () => {
  status.configured = true
  failSync = true
  catalog = [{ id: 9, title: 'Existing Vimeo testimonial', youtubeId: '123456789', youtubeUrl: 'https://vimeo.com/123456789', orientation: 'landscape', isActive: true }]
  const user = await renderManager()
  await user.click(screen.getByRole('button', { name: 'Synchronize channel' }))
  await screen.findByText('YouTube API quota exceeded. Try again later.')
  assert.ok(await screen.findByText('Existing Vimeo testimonial'))
  const request = requests.find(({ config }) => config.url.endsWith('/sync'))
  assert.equal(request.config.timeout, 120000)
})

test('excluding a registry video requires confirmation and sends a protected registry deletion', async () => {
  registry = [candidate(7)]
  const user = await renderManager()
  await user.click(screen.getByRole('button', { name: 'Exclude' }))
  const dialog = screen.getByRole('dialog', { name: 'Exclude video from website' })
  assert.match(dialog.textContent, /prevents automatic synchronization/)
  assert.equal(requests.some(({ config }) => config.method === 'delete'), false)
  await user.click(within(dialog).getByRole('button', { name: 'Exclude from website' }))
  await screen.findByText('Excluded from website')
  assert.equal(requests.find(({ config }) => config.method === 'delete').config.url, '/api/admin/youtube-shorts/7')
})
