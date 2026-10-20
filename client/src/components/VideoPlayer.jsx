import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Play, RotateCcw, Video } from 'lucide-react'
import { loadYouTubeApi, playbackError } from './videoPlayback.js'

export default function VideoPlayer({ video }) {
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const mountRef = useRef(null)
  const { identity } = video

  useEffect(() => {
    if (!requested || !mountRef.current) return
    let disposed = false
    let player
    const mount = mountRef.current
    const iframe = document.createElement('iframe')
    const params = new URLSearchParams({ autoplay: '0', playsinline: '1', controls: '1', rel: '0' })
    if (identity.provider === 'youtube') { params.set('enablejsapi', '1'); params.set('origin', window.location.origin) }
    iframe.src = identity.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${identity.id}?${params}` : `https://player.vimeo.com/video/${identity.id}?autoplay=0`
    iframe.title = video.title || 'Video testimonial'
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
    iframe.allowFullscreen = true
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.className = 'video-embed'
    iframe.onerror = () => { if (!disposed) setError(playbackError()) }
    mount.appendChild(iframe)
    let timer = setTimeout(() => { if (!disposed) setError(playbackError()) }, 20000)

    if (identity.provider === 'youtube') {
      loadYouTubeApi().then((youtube) => {
        if (disposed) return
        player = new youtube.Player(iframe, { events: {
          onReady: () => { clearTimeout(timer); if (!disposed) setReady(true) },
          onError: (event) => { clearTimeout(timer); if (!disposed) setError(playbackError(event.data)) },
        } })
      }).catch(() => { clearTimeout(timer); if (!disposed) setError(playbackError()) })
    } else iframe.onload = () => { clearTimeout(timer); if (!disposed) setReady(true) }

    return () => { disposed = true; clearTimeout(timer); timer = null; player?.destroy?.(); mount.replaceChildren() }
  }, [requested, attempt, identity.id, identity.provider, video.title])

  function retry() { setReady(false); setError(''); setAttempt((value) => value + 1) }

  return <>
    <div className="video-slider-wrapper">
      <div className="video-slide">
        <div className="video-box">
          {!requested ? <>
            {identity.thumbnailUrl && !thumbnailFailed ? <img className="video-thumbnail" src={identity.thumbnailUrl} alt="" loading="lazy" decoding="async" width="480" height="360" onError={() => setThumbnailFailed(true)} /> : <span className="video-thumbnail-fallback" aria-hidden="true"><Video size={48} strokeWidth={1.3} /></span>}
            <button type="button" className="video-load-button" aria-label={`Play video: ${video.title}`} onClick={() => setRequested(true)}><span><Play size={28} fill="currentColor" aria-hidden="true" /></span></button>
            <div className="video-preview-labels">{video.category && <span>{video.category}</span>}{video.destinationCountry && <span>{video.destinationCountry}</span>}</div>
          </> : <div ref={mountRef} className="video-player-mount" />}
        </div>
      </div>
    </div>
    {requested && !ready && !error && <p className="video-player-status" role="status"><LoaderCircle size={17} className="video-loading-icon" aria-hidden="true" /> Loading player…</p>}
    {error && <div className="video-player-error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={retry}><RotateCcw size={15} aria-hidden="true" /> Try loading again</button></div>}
    <div className="video-current-caption"><div><h3>{video.title}</h3>{video.studentName && <p>{video.studentName}</p>}</div><a href={identity.watchUrl} target="_blank" rel="noopener noreferrer">Watch on {identity.provider === 'youtube' ? 'YouTube' : 'Vimeo'}<ExternalLink size={14} aria-hidden="true" /></a></div>
  </>
}
