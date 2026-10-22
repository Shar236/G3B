import { writeFile } from 'node:fs/promises'

const base = process.env.BASE_URL || 'http://127.0.0.1:5173'
const debugUrl = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9222'
const targets = await fetch(`${debugUrl}/json`).then((response) => response.json())
const target = targets.find((item) => item.type === 'page')
if (!target) throw new Error('No Chrome debugging page is available.')

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, { resolve, reject })
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
await send('Page.enable')
await send('Runtime.enable')

const results = []
for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
  for (const route of ['/', '/services', '/partner-with-us', '/insights', '/student/login']) {
    await send('Page.navigate', { url: `${base}${route}` })
    await new Promise((resolve) => setTimeout(resolve, 1800))
    const layout = await evaluate(`(() => {
      const footer = document.querySelector('.g3b-site-footer'); const main = document.querySelector('.site-main');
      if (!footer || !main) return { error: 'Shared layout missing' };
      const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
      const offenders = [...document.querySelectorAll('body *')].filter(el => { const box = el.getBoundingClientRect(); return visible(el) && (box.left < -1 || box.right > innerWidth + 1) && !el.closest('[hidden]'); }).slice(0, 10).map(el => ({ tag: el.tagName, className: String(el.className), left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) }));
      const footerBox = footer.getBoundingClientRect(); const mainBox = main.getBoundingClientRect();
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders, footerOverlap: footerBox.top < mainBox.bottom - 1, footerColumns: getComputedStyle(footer.querySelector('.g3b-footer-grid')).gridTemplateColumns.split(' ').length, loading: main.textContent.includes('Loading G3B Education') };
    })()`)
    const expectedColumns = layout.viewport <= 580 ? 1 : layout.viewport <= 980 ? 2 : 4
    const errors = []
    if (layout.error) errors.push(layout.error)
    if (layout.loading) errors.push('Page remained in loading state')
    if (layout.scrollWidth > layout.viewport + 1) errors.push(`Horizontal overflow ${layout.scrollWidth}`)
    if (layout.footerOverlap) errors.push('Footer overlaps main content')
    if (layout.footerColumns !== expectedColumns) errors.push(`Footer columns ${layout.footerColumns}, expected ${expectedColumns}`)
    results.push({ width, route, errors, ...layout })
    console.log(`${errors.length ? 'FAIL' : 'PASS'} ${width}px ${route}${errors.length ? ` — ${errors.join('; ')}` : ''}`)
  }
}
await writeFile(new URL('../qa-output/cdp-responsive.json', import.meta.url), JSON.stringify({ base, results }, null, 2))
socket.close()
if (results.some((result) => result.errors.length)) process.exitCode = 1
