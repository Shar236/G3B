import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadContentCsv, isSafeAssetUrl, parseVideoUrl, validateContentForm } from '../src/pages/admin/contentTools.js'

test('video previews accept supported provider formats and derive trusted embed URLs', () => {
  for (const value of ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'https://youtube.com/shorts/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk']) {
    assert.deepEqual(parseVideoUrl(value), { provider: 'youtube', id: 'abcdefghijk', embedUrl: 'https://www.youtube-nocookie.com/embed/abcdefghijk' })
  }
  for (const value of ['https://vimeo.com/12345678', 'https://player.vimeo.com/video/12345678']) {
    assert.deepEqual(parseVideoUrl(value), { provider: 'vimeo', id: '12345678', embedUrl: 'https://player.vimeo.com/video/12345678' })
  }
})

test('video previews reject arbitrary hosts, credentials, scripts and malformed IDs', () => {
  for (const value of ['https://youtube.com.attacker.test/watch?v=abcdefghijk', 'javascript:alert(1)', 'https://user:secret@youtube.com/watch?v=abcdefghijk', 'https://youtube.com/watch?v=bad', 'https://player.vimeo.com/video/not-numeric', '//youtube.com/embed/abcdefghijk']) assert.equal(parseVideoUrl(value), null)
})

test('asset validation rejects executable schemes, protocol-relative paths and traversal', () => {
  for (const value of ['/uploads/gallery.webp', 'https://cdn.example.test/image.png']) assert.equal(isSafeAssetUrl(value), true)
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.test/image.png', '/../secret', '/uploads/../secret', '/uploads\\secret', '/uploads/space image.png', 'https://user:secret@example.test/image.png']) assert.equal(isSafeAssetUrl(value), false)
})

test('content validation rejects invalid JSON, missing fields, invalid assets and ratings', () => {
  assert.throws(() => validateContentForm([{ name: 'title', label: 'Title', required: true }], { title: ' ' }, 'gallery'), /Title is required/)
  assert.throws(() => validateContentForm([{ name: 'imageUrl', label: 'Image', type: 'image' }], { imageUrl: 'javascript:alert(1)' }, 'gallery'), /HTTP/)
  assert.throws(() => validateContentForm([{ name: 'packages', label: 'Packages', type: 'json' }], { packages: '{broken' }, 'services'), /valid JSON/)
  assert.throws(() => validateContentForm([{ name: 'rating', label: 'Rating', type: 'number', min: 1, max: 5 }], { rating: 6 }, 'testimonials'), /allowed range/)
  assert.throws(() => validateContentForm([], { youtubeUrl: 'https://attacker.test/embed/123' }, 'videos'), /YouTube or Vimeo/)
})

test('CSV exports preserve Unicode and multiline values while neutralising spreadsheet formulas', async () => {
  const originalDocument = globalThis.document
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  let download
  let clicked = false
  let revoked = false
  try {
    URL.createObjectURL = (blob) => { download = blob; return 'blob:test' }
    URL.revokeObjectURL = () => { revoked = true }
    globalThis.document = { createElement: () => ({ click: () => { clicked = true }, remove() {} }), body: { appendChild() {} } }
    downloadContentCsv('content.csv', [{ title: '=HYPERLINK("https://example.test")', body: 'Pune, भारत\nA "quote"' }], [{ name: 'title', label: 'Title' }, { name: 'body', label: 'Body' }])
    const csv = await download.text()
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.test""\)"/)
    assert.match(csv, /Pune, भारत\nA ""quote""/)
    assert.equal(clicked, true)
    assert.equal(revoked, true)
  } finally {
    globalThis.document = originalDocument
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})
