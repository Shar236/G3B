import { useEffect, useCallback } from 'react'

/**
 * Accessible full-screen photo lightbox with keyboard navigation & captions
 */
export default function MediaLightbox({ photos = [], currentIndex = 0, isOpen, onClose, onIndexChange }) {
  const currentPhoto = photos[currentIndex]

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return
    const nextIdx = (currentIndex - 1 + photos.length) % photos.length
    onIndexChange?.(nextIdx)
  }, [currentIndex, photos.length, onIndexChange])

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return
    const nextIdx = (currentIndex + 1) % photos.length
    onIndexChange?.(nextIdx)
  }, [currentIndex, photos.length, onIndexChange])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, handlePrev, handleNext])

  if (!isOpen || !currentPhoto) return null

  return (
    <div
      className="mg-lightbox-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image Lightbox"
    >
      <div className="mg-lightbox-counter">
        {currentIndex + 1} / {photos.length}
      </div>

      <button
        type="button"
        className="mg-lightbox-close"
        onClick={onClose}
        aria-label="Close lightbox (Esc)"
        title="Close (Esc)"
      >
        <i className="fas fa-xmark fa-lg" aria-hidden="true" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="mg-lightbox-nav mg-lightbox-prev"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            aria-label="Previous image (Left arrow)"
            title="Previous (Left arrow)"
          >
            <i className="fas fa-chevron-left fa-lg" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mg-lightbox-nav mg-lightbox-next"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            aria-label="Next image (Right arrow)"
            title="Next (Right arrow)"
          >
            <i className="fas fa-chevron-right fa-lg" aria-hidden="true" />
          </button>
        </>
      )}

      <div className="mg-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="mg-lightbox-img-wrap">
          <img
            src={currentPhoto.media_url || currentPhoto.thumbnail_url}
            alt={currentPhoto.alt_text || currentPhoto.title || 'G3B Education media'}
            className="mg-lightbox-img"
          />
        </div>
        <div className="mg-lightbox-meta">
          {currentPhoto.category_name && (
            <div className="mg-photo-category">{currentPhoto.category_name}</div>
          )}
          <h3 className="mg-lightbox-title">{currentPhoto.title}</h3>
          {(currentPhoto.caption || currentPhoto.description) && (
            <p className="mg-lightbox-caption">{currentPhoto.caption || currentPhoto.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
