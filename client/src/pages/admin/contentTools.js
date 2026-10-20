/** Parse only supported provider URLs; never embed arbitrary submitted URLs. */
export function parseVideoUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    let id
    if (url.hostname === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0]
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed)\/([^/]+)/.exec(url.pathname)?.[1]
    } else if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) {
      id = /^(?:\/video)?\/(\d+)\/?$/.exec(url.pathname)?.[1]
      return id ? { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` } : null
    }
    return /^[\w-]{11}$/.test(id || '') ? { provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null
  } catch { return null }
}

export function isSafeAssetUrl(value) {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value) || Array.from(value).some((character) => character.charCodeAt(0) < 32)) return false
  if (value.startsWith('/')) return !value.startsWith('//') && !/(?:^|\/)\.\.(?:\/|$)/.test(value)
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export function validateContentForm(fields, form, resource) {
  for (const field of fields) {
    const value = form[field.name]
    if (field.required && !String(value ?? '').trim()) throw new Error(`${field.label} is required.`)
    if (field.type === 'image' && value && !isSafeAssetUrl(value)) throw new Error(`${field.label} must be an HTTP(S) URL or root-relative asset path.`)
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0) || (field.max !== undefined && Number(value) > field.max))) throw new Error(`${field.label} is outside its allowed range.`)
    if (field.type === 'json' && value?.trim()) {
      try { JSON.parse(value) } catch { throw new Error(`${field.label} must contain valid JSON.`) }
    }
    if (field.type === 'list' && String(value || '').split('\n').filter((line) => line.trim()).length > 20) throw new Error(`${field.label} can contain at most 20 items.`)
  }
  if (resource === 'videos' && !parseVideoUrl(form.youtubeUrl)) throw new Error('Enter a valid YouTube or Vimeo video URL.')
}

/** Formula-safe CSV export, including commas, newlines, quotes and Unicode. */
export function downloadContentCsv(filename, records, columns) {
  const cell = (value) => {
    let string = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (/^[\s]*[=+\-@]/.test(string)) string = `'${string}`
    return `"${string.replaceAll('"', '""')}"`
  }
  const csv = '\uFEFF' + [columns.map((column) => cell(column.label)).join(','), ...records.map((record) => columns.map((column) => cell(record[column.name])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
