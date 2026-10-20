import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../api/client.js'

const AUTOPLAY_MS = 5000

/** Automatic image slider — shows full uncropped image with blurred bg fill & fullscreen lightbox. */
export default function Gallery({ content = {}, images = [] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const total = images.length
  const timer = useRef(null)

  const goTo = useCallback(
    (next) => {
      if (total === 0) return
      setIndex(((next % total) + total) % total)
    },
    [total],
  )

  const openLightbox = (idx) => {
    setLightboxIndex(idx)
    setPaused(true)
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
    setPaused(false)
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev - 1 + total) % total)
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev + 1) % total)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, total])

  useEffect(() => {
    if (total <= 1 || paused || lightboxIndex !== null) return undefined
    timer.current = window.setInterval(() => setIndex((current) => (current + 1) % total), AUTOPLAY_MS)
    return () => window.clearInterval(timer.current)
  }, [total, paused, lightboxIndex])

  if (total === 0) return null

  const activeLightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null

  return (
    <section className="section gallery-section" id="gallery">
      <div className="container">
        <h2 className="section-title">{content.gallery?.heading || 'Life at G3B Education'}</h2>
        {content.gallery?.subheading ? <p className="section-subtitle">{content.gallery.subheading}</p> : null}

        <div
          className="slider-wrapper"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-roledescription="carousel"
          aria-label="Gallery"
        >
          <div className="slider-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {images.map((image, position) => {
              const src = resolveMediaUrl(image.imageUrl)
              return (
                <div
                  className="slide"
                  key={image.id}
                  aria-hidden={position !== index}
                  aria-roledescription="slide"
                  onClick={() => openLightbox(position)}
                >
                  {/* Blurred background fills the letterbox area with genuine colors */}
                  <div
                    className="slide-bg-blur"
                    style={{ backgroundImage: `url(${src})` }}
                    aria-hidden="true"
                  />

                  {/* Expand button */}
                  <button
                    type="button"
                    className="slide-expand-btn"
                    aria-label="View full size image"
                    title="Click to view full photo"
                    onClick={(e) => {
                      e.stopPropagation()
                      openLightbox(position)
                    }}
                  >
                    <i className="fas fa-expand" aria-hidden="true" />
                  </button>

                  {/* The actual full image — completely visible without cropping */}
                  <img
                    src={src}
                    alt={image.altText || image.caption || 'Life at G3B Education'}
                    loading={position === 0 ? 'eager' : 'lazy'}
                  />

                  {/* Caption overlay */}
                  <div className="slide-overlay">
                    {image.caption ? (
                      <div className="slide-caption">
                        <p>{image.caption}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {total > 1 ? (
            <>
              <button
                type="button"
                className="slider-nav slider-prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(index - 1)
                }}
              >
                <i className="fas fa-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="slider-nav slider-next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(index + 1)
                }}
              >
                <i className="fas fa-chevron-right" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <div className="slider-dots">
            {images.map((image, position) => (
              <button
                type="button"
                key={image.id}
                className={`dot${position === index ? ' active' : ''}`}
                aria-label={`Go to image ${position + 1}`}
                aria-current={position === index}
                onClick={() => goTo(position)}
              />
            ))}
          </div>
        ) : null}

        {/* Fullscreen Lightbox Modal */}
        {lightboxIndex !== null && activeLightboxImage ? (
          <div
            className="gallery-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged photo view"
            onClick={closeLightbox}
          >
            <button
              type="button"
              className="gallery-lightbox-close"
              aria-label="Close fullscreen view"
              onClick={closeLightbox}
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  className="gallery-lightbox-nav gallery-lightbox-prev"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex((prev) => (prev - 1 + total) % total)
                  }}
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="gallery-lightbox-nav gallery-lightbox-next"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex((prev) => (prev + 1) % total)
                  }}
                >
                  <i className="fas fa-chevron-right" aria-hidden="true" />
                </button>
              </>
            ) : null}

            <div
              className="gallery-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={resolveMediaUrl(activeLightboxImage.imageUrl)}
                alt={activeLightboxImage.altText || activeLightboxImage.caption || 'Enlarged photo'}
                className="gallery-lightbox-img"
              />
              {activeLightboxImage.caption ? (
                <div className="gallery-lightbox-caption">
                  <p>{activeLightboxImage.caption}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
