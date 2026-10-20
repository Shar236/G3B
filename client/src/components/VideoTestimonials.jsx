import { useState, useMemo } from 'react'

/**
 * Performance-optimized video testimonial slider with category filtering tabs
 * and high-resolution thumbnail facades (zero heavy iframe cost until clicked).
 */
export default function VideoTestimonials({ content = {}, videos = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [index, setIndex] = useState(0)
  const [playingId, setPlayingId] = useState(null)

  // Derive unique categories from videos list
  const categories = useMemo(() => {
    const set = new Set(['All'])
    for (const v of videos) {
      if (v.category) set.add(v.category)
    }
    return Array.from(set)
  }, [videos])

  // Filtered videos list
  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'All') return videos
    return videos.filter((v) => v.category === selectedCategory)
  }, [videos, selectedCategory])

  const total = filteredVideos.length

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat)
    setIndex(0)
    setPlayingId(null)
  }

  const goTo = (next) => {
    setPlayingId(null)
    setIndex(((next % total) + total) % total)
  }

  if (videos.length === 0) return null

  return (
    <section className="section" id="video-testimonial">
      <div className="container">
        <h2 className="section-title">{content.videos?.heading || 'Hear It From Them'}</h2>
        {content.videos?.subheading ? <p className="section-subtitle">{content.videos.subheading}</p> : null}

        {/* Category Tabs */}
        {categories.length > 2 ? (
          <div
            className="video-category-tabs"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '28px',
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        {total === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>No video testimonials in this category.</p>
        ) : (
          <div className="video-slider-wrapper">
            <div className="video-slider-track" style={{ transform: `translateX(-${index * 100}%)` }}>
              {filteredVideos.map((video) => {
                const isPlaying = playingId === video.id
                const aspectRatio = video.orientation === 'portrait' ? '9/16' : '16/9'

                return (
                  <div className="video-slide" key={video.id}>
                    <div
                      className="video-box"
                      style={{
                        aspectRatio,
                        backgroundImage: `url('https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      }}
                    >
                      {isPlaying ? (
                        <iframe
                          className="video-embed"
                          src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                          title={video.title}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                        />
                      ) : (
                        <>
                          {/* Top Badges */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '14px',
                              left: '14px',
                              display: 'flex',
                              gap: '8px',
                              zIndex: 2,
                            }}
                          >
                            {video.category ? (
                              <span
                                style={{
                                  background: 'rgba(11, 44, 95, 0.85)',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: '14px',
                                  backdropFilter: 'blur(4px)',
                                }}
                              >
                                {video.category}
                              </span>
                            ) : null}
                            {video.destinationCountry ? (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.9)',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: '14px',
                                }}
                              >
                                {video.destinationCountry}
                              </span>
                            ) : null}
                          </div>

                          {/* High impact play button facade */}
                          <button
                            type="button"
                            className="play-btn"
                            aria-label={`Play video: ${video.title}`}
                            onClick={() => setPlayingId(video.id)}
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '68px',
                              height: '68px',
                              borderRadius: '50%',
                              background: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '22px',
                              cursor: 'pointer',
                              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
                              zIndex: 2,
                              transition: 'transform 0.2s, background 0.2s',
                            }}
                          >
                            <i className="fas fa-play" style={{ marginLeft: '4px' }} aria-hidden="true" />
                          </button>

                          <div
                            className="video-caption"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              insetInline: 0,
                              padding: '16px 20px',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              zIndex: 2,
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block', fontSize: '15px' }}>{video.title}</strong>
                              {video.studentName ? (
                                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{video.studentName}</span>
                              ) : null}
                            </div>
                            <a
                              href={video.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#f87171', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <i className="fab fa-youtube" aria-hidden="true" /> Watch
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  className="video-slider-nav video-slider-prev"
                  aria-label="Previous video"
                  onClick={() => goTo(index - 1)}
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="video-slider-nav video-slider-next"
                  aria-label="Next video"
                  onClick={() => goTo(index + 1)}
                >
                  <i className="fas fa-chevron-right" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        )}

        {total > 1 ? (
          <div className="video-slider-dots">
            {filteredVideos.map((video, position) => (
              <button
                type="button"
                key={video.id}
                className={`video-dot${position === index ? ' active' : ''}`}
                aria-label={`Go to video ${position + 1}`}
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
