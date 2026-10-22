import { useEffect, useMemo } from 'react'

/**
 * Helper to parse video provider & embed URL safely
 */
function resolveVideoEmbed(video) {
  if (!video) return null

  const externalUrl = video.external_video_url || ''
  const mediaUrl = video.media_url || ''

  // 1. YouTube check
  const ytMatch = externalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`,
      isPortrait: externalUrl.includes('/shorts/'),
    }
  }

  // 2. Vimeo check
  const vimeoMatch = externalUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      isPortrait: false,
    }
  }

  // 3. HTML5 direct video (MP4, WebM, Cloudinary or self-hosted)
  const directSrc = mediaUrl || externalUrl
  if (directSrc) {
    return {
      type: 'html5',
      embedUrl: directSrc,
      isPortrait: false,
    }
  }

  return null
}

export default function VideoPlayerModal({ video, isOpen, onClose }) {
  const embed = useMemo(() => resolveVideoEmbed(video), [video])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !video) return null

  return (
    <div
      className="mg-video-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={video.title || 'Video Player'}
    >
      <button
        type="button"
        className="mg-lightbox-close"
        onClick={onClose}
        aria-label="Close video player (Esc)"
        title="Close (Esc)"
      >
        <i className="fas fa-xmark fa-lg" aria-hidden="true" />
      </button>

      <div className="mg-video-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className={`mg-video-player-wrap ${embed?.isPortrait ? 'portrait-mode' : ''}`}>
          {embed?.type === 'youtube' || embed?.type === 'vimeo' ? (
            <iframe
              src={embed.embedUrl}
              title={video.title || 'G3B Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : embed?.type === 'html5' ? (
            <video
              src={embed.embedUrl}
              controls
              autoPlay
              playsInline
              poster={video.thumbnail_url || ''}
            >
              Your browser does not support HTML5 video playback.
            </video>
          ) : (
            <div className="mg-empty-state">
              <i className="fas fa-video-slash fa-3x" aria-hidden="true" />
              <p>Unable to load video source.</p>
            </div>
          )}
        </div>

        <div className="mg-video-modal-details">
          {video.category_name && (
            <div className="mg-video-cat">{video.category_name}</div>
          )}
          <h3 className="mg-video-modal-title">{video.title}</h3>
          {video.description && (
            <p className="mg-video-modal-desc">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
