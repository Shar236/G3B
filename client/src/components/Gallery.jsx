import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../api/client.js'

const AUTOPLAY_MS = 4500

/** Automatic image slider — shows full image with blurred bg fill. */
export default function Gallery({ content = {}, images = [] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = images.length
  const timer = useRef(null)

  const goTo = useCallback(
    (next) => {
      if (total === 0) return
      setIndex(((next % total) + total) % total)
    },
    [total],
  )

  useEffect(() => {
    if (total <= 1 || paused) return undefined
    timer.current = window.setInterval(() => setIndex((current) => (current + 1) % total), AUTOPLAY_MS)
    return () => window.clearInterval(timer.current)
  }, [total, paused])

  if (total === 0) return null

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
                >
                  {/* Blurred background fills the letterbox area */}
                  <div
                    className="slide-bg-blur"
                    style={{ backgroundImage: `url(${src})` }}
                    aria-hidden="true"
                  />

                  {/* The actual full image */}
                  <img
                    src={src}
                    alt={image.altText || image.caption || 'Life at G3B Education'}
                    width="1200"
                    height="900"
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
              <button type="button" className="slider-nav slider-prev" aria-label="Previous image" onClick={() => goTo(index - 1)}>
                <i className="fas fa-chevron-left" aria-hidden="true" />
              </button>
              <button type="button" className="slider-nav slider-next" aria-label="Next image" onClick={() => goTo(index + 1)}>
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
      </div>
    </section>
  )
}
