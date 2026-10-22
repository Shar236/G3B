// Run with BASE_URL and, if Playwright is outside this project, PLAYWRIGHT_MODULE.
// Example: node docs/qa/shared-chrome.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const base = process.env.BASE_URL || 'http://127.0.0.1:5173'
const output = new URL('../qa-output/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ reducedMotion: 'reduce' })
const results = []
const runtimeErrors = []
const failedResponses = []
page.on('pageerror', (error) => runtimeErrors.push(error.message))
page.on('response', (response) => {
  if (response.status() >= 400 && response.status() !== 401) failedResponses.push({ status: response.status(), url: response.url() })
})

try {
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/services', '/partner-with-us', '/insights', '/student/login']) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('.g3b-site-footer').waitFor()
      await page.waitForFunction(() => !document.querySelector('.site-main')?.textContent.includes('Loading G3B Education'))
      await page.evaluate(() => document.fonts.ready)
      const layout = await page.evaluate(() => {
        const header = document.querySelector('.g3b-site-header')
        const footer = document.querySelector('.g3b-site-footer')
        const footerBox = footer.getBoundingClientRect()
        const mainBox = document.querySelector('.site-main').getBoundingClientRect()
        const visible = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'
        const offenders = [...document.querySelectorAll('body *')].filter((el) => {
          const box = el.getBoundingClientRect()
          return visible(el) && (box.left < -1 || box.right > innerWidth + 1) && !el.closest('[hidden]')
        }).slice(0, 15).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 65), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }))
        const clippedFooter = [...footer.querySelectorAll('a, p, h2, button')].filter((el) => {
          const box = el.getBoundingClientRect()
          return visible(el) && (box.bottom > footerBox.bottom + 1 || box.right > footerBox.right + 1 || box.left < footerBox.left - 1)
        }).map((el) => el.textContent)
        const headerBoxes = ['.g3b-brand', '.g3b-navigation', '.header-actions'].map((selector) => header.querySelector(selector)).filter(visible).map((el) => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }))
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders, clippedFooter, footerOverlapsMain: footerBox.top < mainBox.bottom - 1, columns: getComputedStyle(footer.querySelector('.g3b-footer-grid')).gridTemplateColumns.split(' ').length, headerBoxes, footerBackground: getComputedStyle(footer).backgroundColor }
      })
      const errors = []
      if (layout.scrollWidth > width + 1) errors.push(`Horizontal overflow: ${layout.scrollWidth}`)
      if (layout.clippedFooter.length) errors.push('Footer content exceeds bounds')
      if (layout.footerOverlapsMain) errors.push('Footer overlaps main')
      if (layout.columns !== (width <= 580 ? 1 : width <= 980 ? 2 : 4)) errors.push(`Unexpected footer columns: ${layout.columns}`)
      if (layout.headerBoxes.some((box, index) => index && box.left < layout.headerBoxes[index - 1].right - 1)) errors.push('Header items overlap')
      if (layout.headerBoxes.some((box) => box.left < 0 || box.right > width)) errors.push('Header clipped')
      results.push({ route, width, errors, ...layout })
      console.log(`${errors.length ? 'FAIL' : 'PASS'} ${width}px ${route}${errors.length ? `: ${errors.join('; ')}` : ''}`)
      if (route === '/services' && [375, 1440].includes(width)) {
        await page.screenshot({ path: new URL(`services-${width}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true })
      }
    }
  }

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 850 }]) {
    await page.setViewportSize(viewport)
    for (const [route, label] of [['/', 'home'], ['/partner-with-us', 'partner']]) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !document.querySelector('.site-main')?.textContent.includes('Loading G3B Education'))
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: new URL(`${label}-${viewport.width}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1') })
      await page.locator('.g3b-site-footer').scrollIntoViewIfNeeded()
      await page.screenshot({ path: new URL(`${label}-footer-${viewport.width}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1') })
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${base}/services`)
  const services = page.getByRole('button', { name: 'Our Services', exact: true })
  const panel = page.locator('#navigation-dropdown-2')
  await services.hover()
  await panel.waitFor({ state: 'visible' })
  await panel.getByRole('link', { name: /Career Counselling/ }).hover()
  assert.equal(await services.getAttribute('aria-expanded'), 'true', 'Hover bridge keeps services open')
  await services.click()
  await page.keyboard.press('ArrowDown')
  assert.equal(await panel.getByRole('link').first().evaluate((el) => el === document.activeElement), true)
  await page.keyboard.press('End')
  assert.equal(await panel.getByRole('link').last().evaluate((el) => el === document.activeElement), true)
  await page.keyboard.press('Escape')
  assert.equal(await services.getAttribute('aria-expanded'), 'false')
  assert.equal(await services.evaluate((el) => el === document.activeElement), true)
  await services.click()
  await page.locator('h1').click()
  assert.equal(await services.getAttribute('aria-expanded'), 'false')
  await services.click()
  await panel.getByRole('link', { name: /Psychometric Assessment/ }).click()
  await page.waitForURL('**/services#psychometric-assessment')
  assert.equal(await services.getAttribute('aria-expanded'), 'false')
  console.log('PASS desktop hover, pointer bridge, keyboard, Escape, outside click and navigation')

  for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${base}/services`)
    const toggle = page.getByRole('button', { name: 'Open navigation menu' })
    await toggle.click()
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
    await services.click()
    assert.equal(await services.getAttribute('aria-expanded'), 'true')
    await panel.getByRole('link', { name: /Scholarship Guidance/ }).click()
    await page.waitForURL('**/services#scholarship-guidance')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    await toggle.click()
    await page.keyboard.press('Escape')
    assert.equal(await toggle.evaluate((el) => el === document.activeElement), true)
    await toggle.click()
    await page.locator('.mobile-counselling-cta').click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    assert.equal(await toggle.evaluate((el) => el === document.activeElement), true)
    console.log(`PASS mobile ${viewport.width}x${viewport.height}: expandable menu, navigation, scroll lock, modal and focus restoration`)
  }

  await page.locator('.g3b-footer-book').click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  console.log('PASS footer booking CTA opens counselling form')
} finally {
  const report = { base, results, runtimeErrors, failedResponses }
  await writeFile(new URL('shared-chrome.json', output), JSON.stringify(report, null, 2))
  await browser.close()
}

assert.equal(results.filter((result) => result.errors.length).length, 0, 'Responsive layout failures (see docs/qa-output/shared-chrome.json)')
assert.deepEqual(runtimeErrors, [], 'Browser runtime errors')
console.log('PASS shared chrome QA')
