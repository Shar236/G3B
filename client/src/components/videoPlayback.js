const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'])

/** Only build embeds and outbound links for validated, matching provider IDs. */
export function videoIdentity(video) {
  try {
    const url = new URL(video.youtubeUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    if (YOUTUBE_HOSTS.has(url.hostname)) {
      const id = url.hostname === 'youtu.be' ? url.pathname.split('/')[1] : url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : null
      if (!YOUTUBE_ID.test(id || '') || id !== video.youtubeId) return null
      return { provider: 'youtube', id, key: `youtube:${id}`, watchUrl: `https://www.youtube.com/watch?v=${id}`, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) {
      const id = url.pathname.match(/(?:^|\/)(\d+)\/?$/)?.[1]
      if (!id || id !== String(video.youtubeId)) return null
      return { provider: 'vimeo', id, key: `vimeo:${id}`, watchUrl: `https://vimeo.com/${id}`, thumbnailUrl: null }
    }
  } catch { /* Invalid registry rows are never turned into embeds. */ }
  return null
}

export function playableVideos(videos) {
  const seen = new Set()
  return videos.flatMap((video) => {
    if (video.isActive === false || video.isActive === 0 || video.embeddable === false || ['unavailable', 'embedding_disabled', 'private', 'deleted', 'blocked'].includes(video.availability)) return []
    const identity = videoIdentity(video)
    if (!identity || seen.has(identity.key)) return []
    seen.add(identity.key)
    return [{ ...video, identity }]
  })
}

/** A bounded dot window, while arrows and the video selector reach every item. */
export function paginationWindow(index, total, size = 7) {
  const start = Math.max(0, Math.min(index - Math.floor(size / 2), total - size))
  return Array.from({ length: Math.min(total, size) }, (_, offset) => start + offset)
}

export function playbackError(code) {
  if ([100, 101, 150].includes(Number(code))) return 'This video is unavailable or its owner has disabled playback on other websites.'
  if (Number(code) === 153) return 'YouTube could not verify this player. You can watch the video directly on YouTube.'
  return 'The video could not load here. Try again or watch it directly on YouTube.'
}

let apiPromise

/** Load the documented IFrame API once, only after a visitor requests playback. */
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    let script = document.getElementById('g3b-youtube-player-api')
    let timer
    function cleanup() {
      clearTimeout(timer)
      script?.removeEventListener('error', failed)
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous
    }
    function failed() {
      cleanup()
      script?.remove()
      apiPromise = null
      reject(new Error('YouTube player could not be loaded.'))
    }
    function ready() {
      cleanup()
      try { previous?.() } catch { /* Preserve another integration without preventing this player. */ }
      if (window.YT?.Player) resolve(window.YT)
      else failed()
    }
    window.onYouTubeIframeAPIReady = ready
    if (!script) {
      script = document.createElement('script')
      script.id = 'g3b-youtube-player-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('error', failed, { once: true })
    timer = setTimeout(failed, 15000)
  })
  return apiPromise
}
