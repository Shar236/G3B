import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost:5173/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'MutationObserver', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { createElement: h } = await import('react')
const { render, cleanup, screen, fireEvent, waitFor, act } = await import('@testing-library/react')
const { default: userEvent } = await import('@testing-library/user-event')
const vite = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
})
const [{ default: VideoTestimonials }, { loadYouTubeApi, videoIdentity }] = await Promise.all([
  vite.ssrLoadModule('/src/components/VideoTestimonials.jsx'),
  vite.ssrLoadModule('/src/components/videoPlayback.js'),
])

// Synthetic IDs are test fixtures only. No request is made to YouTube in jsdom.
function fixture(number, extra = {}) {
  const youtubeId = `test${String(number).padStart(7, '0')}`
  return { id: number, title: `Testimonial ${number}`, youtubeId, youtubeUrl: `https://www.youtube.com/shorts/${youtubeId}`, ...extra }
}

const players = []
function installPlayerMock() {
  window.YT = { Player: function Player(iframe, options) {
    this.iframe = iframe
    this.events = options.events
    this.destroyCount = 0
    this.destroy = () => { this.destroyCount += 1; iframe.remove() }
    players.push(this)
  } }
}

beforeEach(() => { players.length = 0; installPlayerMock() })
afterEach(() => cleanup())
after(async () => { await vite.close(); dom.window.close() })

function assertCurrent(number, position, total) {
  assert.ok(screen.getByRole('heading', { name: `Testimonial ${number}` }))
  assert.ok(screen.getByRole('group', { name: `Video ${position} of ${total}` }))
  assert.match(document.querySelector('.video-carousel-controls').textContent, new RegExp(`Video ${position} of ${total}`))
}

test('all fixed category filters remain available and unassigned videos stay in All', async () => {
  const user = userEvent.setup()
  render(h(VideoTestimonials, { videos: [fixture(1), fixture(2, { category: 'What Parents Say' })] }))
  assert.equal(screen.getByRole('button', { name: 'All', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.ok(screen.getByRole('button', { name: 'Student Review', exact: true }))
  assertCurrent(1, 1, 2)
  await user.click(screen.getByRole('button', { name: 'What Parents Say', exact: true }))
  assertCurrent(2, 1, 1)
  assert.equal(screen.getByRole('button', { name: 'Previous video' }).disabled, true)
  assert.equal(screen.getByRole('button', { name: 'Next video' }).disabled, true)
  await user.click(screen.getByRole('button', { name: 'Student Review', exact: true }))
  assert.match(screen.getByRole('region', { name: 'Video testimonials' }).textContent, /No videos have been assigned/)
  assert.equal(screen.queryByRole('button', { name: /Play video/ }), null)
  await user.click(screen.getByRole('button', { name: 'Show all videos' }))
  assertCurrent(1, 1, 2)
})

test('arrows, keyboard wrapping, bounded dots, and the selector reach every video beyond the initial window', async () => {
  const user = userEvent.setup()
  render(h(VideoTestimonials, { videos: Array.from({ length: 12 }, (_, index) => fixture(index + 1)) }))
  assertCurrent(1, 1, 12)
  assert.equal(screen.getAllByRole('button', { name: /^Go to video/ }).length, 7)
  await user.click(screen.getByRole('button', { name: 'Previous video' }))
  assertCurrent(12, 12, 12)
  await user.click(screen.getByRole('button', { name: 'Next video' }))
  assertCurrent(1, 1, 12)
  const carousel = screen.getByRole('region', { name: 'Video testimonials' })
  carousel.focus()
  await user.keyboard('{ArrowLeft}')
  assertCurrent(12, 12, 12)
  await user.keyboard('{ArrowRight}{ArrowRight}')
  assertCurrent(2, 2, 12)
  await user.keyboard('{End}')
  assertCurrent(12, 12, 12)
  await user.keyboard('{Home}')
  assertCurrent(1, 1, 12)
  const selector = screen.getByLabelText('Jump to a video')
  assert.equal(selector.options.length, 12)
  await user.selectOptions(selector, 'youtube:test0000010')
  assertCurrent(10, 10, 12)
  assert.equal(screen.getByRole('button', { name: /^Go to video 10:/ }).getAttribute('aria-current'), 'true')
  // Select keyboard interactions must not also advance the containing carousel.
  fireEvent.keyDown(selector, { key: 'Home' })
  assertCurrent(10, 10, 12)
  await user.click(screen.getByRole('button', { name: /^Go to video 12:/ }))
  assertCurrent(12, 12, 12)
})

test('deduplication, invalid identities, disabled videos, and known unavailable entries cannot become players', () => {
  const videos = [
    fixture(1), fixture(1, { id: 91, title: 'Duplicate registry row' }),
    fixture(2, { youtubeUrl: 'https://youtube.com.evil.example/shorts/test0000002' }),
    fixture(3, { youtubeId: 'test0000004' }), fixture(4, { isActive: false }),
    fixture(5, { availability: 'private' }), fixture(6, { availability: 'deleted' }),
    fixture(7, { embeddable: false }), fixture(8, { availability: 'embedding_disabled' }),
    fixture(9, { availability: 'blocked' }), fixture(10),
  ]
  render(h(VideoTestimonials, { videos }))
  assertCurrent(1, 1, 2)
  assert.equal(screen.getAllByRole('button', { name: /^Go to video/ }).length, 2)
  assert.equal(document.querySelectorAll('iframe').length, 0)
  assert.equal(screen.queryByText('Duplicate registry row'), null)
  assert.equal(videoIdentity(fixture(1, { youtubeUrl: 'javascript:alert(1)' })), null)
  assert.equal(videoIdentity(fixture(1, { youtubeUrl: 'https://user:password@youtube.com/shorts/test0000001' })), null)
})

test('catalog updates preserve the selected identity across reorder and safely reset when it disappears', async () => {
  const user = userEvent.setup()
  const first = fixture(1)
  const second = fixture(2)
  const third = fixture(3)
  const view = render(h(VideoTestimonials, { videos: [first, second, third] }))
  await user.click(screen.getByRole('button', { name: /^Go to video 3:/ }))
  assertCurrent(3, 3, 3)
  view.rerender(h(VideoTestimonials, { videos: [third, first, second] }))
  assertCurrent(3, 1, 3)
  view.rerender(h(VideoTestimonials, { videos: [second, first] }))
  assertCurrent(2, 1, 2)
  view.rerender(h(VideoTestimonials, { videos: [] }))
  assert.match(screen.getByRole('region', { name: 'Video testimonials' }).textContent, /will appear here when they are available/)
  assert.equal(document.querySelectorAll('iframe').length, 0)
})

test('only the clicked active player loads and navigating destroys it before the next video is requested', async () => {
  const user = userEvent.setup()
  render(h(VideoTestimonials, { videos: [fixture(1), fixture(2)] }))
  assert.equal(document.querySelectorAll('iframe').length, 0)
  assert.equal(document.querySelectorAll('img').length, 1)
  assert.equal(document.querySelector('img').getAttribute('loading'), 'lazy')
  await user.click(screen.getByRole('button', { name: 'Play video: Testimonial 1' }))
  await waitFor(() => assert.equal(players.length, 1))
  const iframe = document.querySelector('iframe')
  const embed = new URL(iframe.src)
  assert.equal(embed.origin, 'https://www.youtube-nocookie.com')
  assert.equal(embed.pathname, '/embed/test0000001')
  assert.equal(embed.searchParams.get('enablejsapi'), '1')
  assert.equal(embed.searchParams.get('origin'), window.location.origin)
  assert.equal(embed.searchParams.get('autoplay'), '0')
  assert.equal(embed.searchParams.get('controls'), '1')
  assert.equal(iframe.referrerPolicy, 'strict-origin-when-cross-origin')
  assert.equal(iframe.allowFullscreen, true)
  assert.match(screen.getByRole('status').textContent, /Loading player/)
  act(() => players[0].events.onReady())
  assert.equal(screen.queryByRole('status'), null)
  await user.click(screen.getByRole('button', { name: 'Next video' }))
  assert.equal(players[0].destroyCount, 1)
  assert.equal(document.querySelectorAll('iframe').length, 0)
  assertCurrent(2, 2, 2)
  // A late callback from a destroyed player must not affect the next slide.
  act(() => players[0].events.onError({ data: 100 }))
  assert.equal(screen.queryByRole('alert'), null)
  await user.click(screen.getByRole('button', { name: 'Play video: Testimonial 2' }))
  await waitFor(() => assert.equal(players.length, 2))
  assert.equal(document.querySelectorAll('iframe').length, 1)
  assert.match(document.querySelector('iframe').src, /\/embed\/test0000002\?/)
})

for (const code of [100, 150, 153]) {
  test(`official player error ${code} exposes a watch fallback and retry replaces the failed instance`, async () => {
    const user = userEvent.setup()
    render(h(VideoTestimonials, { videos: [fixture(1)] }))
    await user.click(screen.getByRole('button', { name: 'Play video: Testimonial 1' }))
    await waitFor(() => assert.equal(players.length, 1))
    act(() => players[0].events.onError({ data: code }))
    assert.match(screen.getByRole('alert').textContent, code === 153 ? /could not verify this player/ : /unavailable or its owner has disabled/)
    assert.equal(screen.queryByRole('status'), null)
    assert.equal(screen.getByRole('link', { name: 'Watch on YouTube' }).href, 'https://www.youtube.com/watch?v=test0000001')
    await user.click(screen.getByRole('button', { name: 'Try loading again' }))
    await waitFor(() => assert.equal(players.length, 2))
    assert.equal(players[0].destroyCount, 1)
    assert.equal(document.querySelectorAll('iframe').length, 1)
    assert.equal(screen.queryByRole('alert'), null)
    act(() => players[1].events.onReady())
    assert.equal(screen.queryByRole('status'), null)
  })
}

test('an unavailable thumbnail gets a local fallback while the play button and caption remain accessible', async () => {
  const user = userEvent.setup()
  render(h(VideoTestimonials, { videos: [fixture(1, { category: 'Student Review' })] }))
  const thumbnail = document.querySelector('img')
  assert.equal(thumbnail.alt, '')
  fireEvent.error(thumbnail)
  assert.equal(document.querySelector('img'), null)
  assert.ok(document.querySelector('.video-thumbnail-fallback'))
  assert.ok(screen.getByRole('heading', { name: 'Testimonial 1' }))
  await user.click(screen.getByRole('button', { name: 'Play video: Testimonial 1' }))
  await waitFor(() => assert.equal(players.length, 1))
})

test('catalog loading, request failure with retry, and an empty catalog have distinct accessible states', async () => {
  const user = userEvent.setup()
  let retries = 0
  const view = render(h(VideoTestimonials, { loading: true, videos: [fixture(1)] }))
  assert.match(screen.getByRole('status').textContent, /Loading video testimonials/)
  assert.equal(screen.getByRole('region', { name: 'Video testimonials' }).getAttribute('aria-busy'), 'true')
  assert.equal(screen.queryByRole('button', { name: /Play video/ }), null)
  view.rerender(h(VideoTestimonials, { error: new Error('Backend request failed'), onRetry: () => { retries += 1 } }))
  assert.match(screen.getByRole('alert').textContent, /load the video testimonials/)
  assert.equal(screen.queryByRole('status'), null)
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  assert.equal(retries, 1)
  assert.equal(screen.getByRole('link', { name: /Visit our YouTube Shorts/ }).href, 'https://www.youtube.com/@g3beducation_nerul/shorts')
  view.rerender(h(VideoTestimonials, { videos: [] }))
  assert.equal(screen.queryByRole('alert'), null)
  assert.match(screen.getByRole('region', { name: 'Video testimonials' }).textContent, /will appear here/)
})

test('official API loading is shared across callers and a failed script can be retried', async () => {
  delete window.YT
  let previousCalls = 0
  window.onYouTubeIframeAPIReady = () => { previousCalls += 1 }
  const first = loadYouTubeApi()
  const second = loadYouTubeApi()
  assert.equal(first, second)
  const failedScript = document.getElementById('g3b-youtube-player-api')
  assert.equal(failedScript.src, 'https://www.youtube.com/iframe_api')
  assert.equal(document.querySelectorAll('#g3b-youtube-player-api').length, 1)
  const failure = assert.rejects(first, /could not be loaded/)
  failedScript.dispatchEvent(new Event('error'))
  await failure
  assert.equal(document.getElementById('g3b-youtube-player-api'), null)
  const retried = loadYouTubeApi()
  assert.notEqual(retried, first)
  assert.equal(document.querySelectorAll('#g3b-youtube-player-api').length, 1)
  installPlayerMock()
  window.onYouTubeIframeAPIReady()
  assert.equal(await retried, window.YT)
  assert.equal(previousCalls, 1)
  document.getElementById('g3b-youtube-player-api').remove()
  delete window.onYouTubeIframeAPIReady
})
