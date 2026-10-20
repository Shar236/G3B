const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

/** Extract an 11-character YouTube video ID from any valid YouTube URL. */
export function extractYouTubeId(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (YOUTUBE_ID_REGEX.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return YOUTUBE_ID_REGEX.test(id) ? id : null
    }
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v')
        return YOUTUBE_ID_REGEX.test(id || '') ? id : null
      }
      const match = url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/i)
      if (match && YOUTUBE_ID_REGEX.test(match[1])) return match[1]
    }
  } catch {
    return null
  }
  return null
}

export function getYouTubeEmbedUrl(id) {
  if (!id || !YOUTUBE_ID_REGEX.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

export function getYouTubeThumbnailUrl(id, quality = 'hqdefault') {
  if (!id || !YOUTUBE_ID_REGEX.test(id)) return null
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`
}

/** Validate official URL shapes locally; channel ownership is checked by the server. */
export function isYoutubeRegistrationUrl(value) {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return false
    if (url.hostname === 'youtu.be') return /^\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) return false
    if (url.pathname === '/watch') return /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v') || '')
    return /^\/(?:shorts|embed)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)
  } catch {
    return false
  }
}

export function shortsRegistryState(item) {
  if (item.excluded) return { label: 'Excluded from website', filter: 'excluded' }
  if (item.availability === 'embedding_disabled') return { label: 'Embedding disabled', filter: 'unavailable' }
  if (item.availability === 'unavailable') return { label: 'Unavailable on YouTube', filter: 'unavailable' }
  if (!item.channelVerified || item.availability !== 'available') return { label: 'Awaiting channel verification', filter: 'pending' }
  if (!item.verifiedShort) return { label: 'Review Shorts status', filter: 'pending' }
  return { label: item.isActive === false ? 'Confirmed Short · hidden' : 'Confirmed Short', filter: 'confirmed' }
}

export const canConfirmShort = (item) => Boolean(item.channelVerified && item.availability === 'available' && !item.excluded && !item.verifiedShort)


