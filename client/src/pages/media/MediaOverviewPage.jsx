import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import { fetchMediaOverview } from '../../api/mediaGalleryApi.js'
import MediaLightbox from './MediaLightbox.jsx'
import VideoPlayerModal from './VideoPlayerModal.jsx'
import '../../styles/media-gallery.css'

export default function MediaOverviewPage() {
  const [data, setData] = useState({
    featuredPhotos: [],
    featuredVideos: [],
    recentMedia: [],
    stats: { photos: 0, videos: 0, total: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  // Filter for featured section: 'all' | 'photo' | 'video'
  const [featuredTab, setFeaturedTab] = useState('all')

  useDocumentMeta({
    title: 'Media Gallery — Life at G3B | Photos & Videos',
    description:
      'Explore life at G3B through photographs and videos featuring our activities, student experiences, events, guidance sessions, workshops, and community moments.',
  })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchMediaOverview()
      .then((res) => {
        if (mounted && res) {
          setData(res)
        }
      })
      .catch((err) => {
        console.error('Failed to load media overview:', err)
        if (mounted) setError('Unable to load gallery content right now. Please try again.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Combine featured items for the unified view
  const allFeatured = [
    ...(data.featuredPhotos || []).map((p) => ({ ...p, media_type: 'photo' })),
    ...(data.featuredVideos || []).map((v) => ({ ...v, media_type: 'video' })),
  ]

  const displayedFeatured = allFeatured.filter((item) => {
    if (featuredTab === 'photo') return item.media_type === 'photo'
    if (featuredTab === 'video') return item.media_type === 'video'
    return true
  })

  // Lightbox handler for photos
  const openLightbox = (photoItem) => {
    const photosList = data.featuredPhotos || []
    const idx = photosList.findIndex((p) => p.id === photoItem.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxOpen(true)
  }

  // Video player modal handler
  const openVideoModal = (videoItem) => {
    setActiveVideo(videoItem)
    setVideoModalOpen(true)
  }

  return (
    <div className="media-gallery-page">
      {/* 1. HERO SECTION */}
      <section className="mg-hero" aria-labelledby="mg-main-title">
        <div className="mg-hero-grid" aria-hidden="true" />
        <div className="mg-hero-glow" aria-hidden="true" />

        <div className="mg-hero-container">
          <nav className="mg-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <span>About G3B</span>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <span aria-current="page">Media Gallery</span>
          </nav>

          <div className="mg-eyebrow">
            <i className="fas fa-camera-retro" aria-hidden="true" />
            <span>LIFE AT G3B</span>
          </div>

          <h1 id="mg-main-title">Moments, Stories &amp; Experiences</h1>

          <p className="mg-hero-desc">
            Explore life at G3B through photographs and videos featuring our activities, student experiences, events, guidance sessions, workshops, and community moments.
          </p>

          <div className="mg-hero-actions">
            <Link to="/about/media/photos" className="btn btn-primary">
              <i className="fas fa-images" aria-hidden="true" />
              <span>Explore Photos</span>
            </Link>
            <Link to="/about/media/videos" className="mg-btn-outline">
              <i className="fas fa-play-circle" aria-hidden="true" />
              <span>Watch Videos</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. DEDICATED NAVIGATION HUBS */}
      <section className="mg-hub-section" aria-label="Media Galleries">
        <div className="container">
          <div className="mg-hub-grid">
            {/* Photos Card */}
            <Link to="/about/media/photos" className="mg-hub-card" aria-label="Visit G3B Photo Gallery">
              <div className="mg-hub-preview">
                <img
                  src={
                    data.featuredPhotos?.[0]?.thumbnail_url ||
                    data.featuredPhotos?.[0]?.media_url ||
                    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80'
                  }
                  alt="G3B Photos"
                  loading="lazy"
                />
                <div className="mg-hub-badge">
                  <i className="fas fa-camera" aria-hidden="true" />
                  <span>Photo Gallery</span>
                </div>
                <div className="mg-hub-count">
                  {data.stats?.photos || 10} Photos
                </div>
              </div>
              <div className="mg-hub-body">
                <h2>G3B Photo Gallery</h2>
                <p>
                  Take a closer look at G3B through photographs capturing our events, learning experiences, student interactions, workshops, counselling sessions, and achievements.
                </p>
                <div className="mg-hub-footer">
                  <span>Browse Photos Collection</span>
                  <i className="fas fa-arrow-right" aria-hidden="true" />
                </div>
              </div>
            </Link>

            {/* Videos Card */}
            <Link to="/about/media/videos" className="mg-hub-card" aria-label="Visit G3B Video Gallery">
              <div className="mg-hub-preview">
                <img
                  src={
                    data.featuredVideos?.[0]?.thumbnail_url ||
                    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&auto=format&fit=crop&q=80'
                  }
                  alt="G3B Videos"
                  loading="lazy"
                />
                <div className="mg-hub-badge">
                  <i className="fas fa-video" aria-hidden="true" />
                  <span>Video Gallery</span>
                </div>
                <div className="mg-hub-count">
                  {data.stats?.videos || 5} Videos
                </div>
              </div>
              <div className="mg-hub-body">
                <h2>Watch the G3B Story</h2>
                <p>
                  Discover G3B through videos featuring our activities, student experiences, educational guidance, events, workshops, and insights into studying abroad.
                </p>
                <div className="mg-hub-footer">
                  <span>Watch Video Series</span>
                  <i className="fas fa-arrow-right" aria-hidden="true" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURED MEDIA SHOWCASE */}
      <section className="mg-featured-section" aria-labelledby="featured-heading">
        <div className="container">
          <div className="mg-section-header">
            <div>
              <span className="mg-section-kicker">Curated Highlights</span>
              <h2 id="featured-heading">Featured Media</h2>
            </div>

            <div className="mg-categories" role="tablist" aria-label="Featured Media Type Filter">
              <button
                type="button"
                className={`mg-cat-pill ${featuredTab === 'all' ? 'active' : ''}`}
                onClick={() => setFeaturedTab('all')}
                role="tab"
                aria-selected={featuredTab === 'all'}
              >
                All Featured ({allFeatured.length})
              </button>
              <button
                type="button"
                className={`mg-cat-pill ${featuredTab === 'photo' ? 'active' : ''}`}
                onClick={() => setFeaturedTab('photo')}
                role="tab"
                aria-selected={featuredTab === 'photo'}
              >
                <i className="fas fa-image" aria-hidden="true" /> Photos ({data.featuredPhotos?.length || 0})
              </button>
              <button
                type="button"
                className={`mg-cat-pill ${featuredTab === 'video' ? 'active' : ''}`}
                onClick={() => setFeaturedTab('video')}
                role="tab"
                aria-selected={featuredTab === 'video'}
              >
                <i className="fas fa-play" aria-hidden="true" /> Videos ({data.featuredVideos?.length || 0})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mg-empty-state">
              <i className="fas fa-circle-notch fa-spin fa-2x" aria-hidden="true" />
              <p style={{ marginTop: 12 }}>Loading featured moments…</p>
            </div>
          ) : error ? (
            <div className="mg-empty-state">
              <i className="fas fa-triangle-exclamation fa-2x" style={{ color: '#ef4444' }} aria-hidden="true" />
              <p style={{ marginTop: 12, color: '#ef4444' }}>{error}</p>
            </div>
          ) : displayedFeatured.length === 0 ? (
            <div className="mg-empty-state">
              <i className="fas fa-film fa-2x" aria-hidden="true" />
              <p>No featured media items available right now.</p>
            </div>
          ) : (
            <div className="mg-featured-grid">
              {displayedFeatured.map((item) => {
                const isVideo = item.media_type === 'video'
                return isVideo ? (
                  /* Video Card */
                  <div
                    key={`feat-video-${item.id}`}
                    className="mg-video-card"
                    onClick={() => openVideoModal(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openVideoModal(item)
                      }
                    }}
                    aria-label={`Watch video: ${item.title}`}
                  >
                    <div className="mg-video-thumb">
                      <img
                        src={item.thumbnail_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
                        alt={item.title}
                        loading="lazy"
                      />
                      <div className="mg-video-play" aria-hidden="true">
                        <i className="fas fa-play" />
                      </div>
                      <div className="mg-video-featured-badge">Featured</div>
                      {item.duration && <div className="mg-video-duration">{item.duration}</div>}
                    </div>
                    <div className="mg-video-info">
                      {item.category_name && <div className="mg-video-cat">{item.category_name}</div>}
                      <h3 className="mg-video-title">{item.title}</h3>
                      {item.description && <p className="mg-video-desc">{item.description}</p>}
                    </div>
                  </div>
                ) : (
                  /* Photo Card */
                  <div
                    key={`feat-photo-${item.id}`}
                    className="mg-photo-card"
                    onClick={() => openLightbox(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openLightbox(item)
                      }
                    }}
                    aria-label={`View photo: ${item.title}`}
                  >
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt={item.alt_text || item.title}
                      loading="lazy"
                    />
                    <div className="mg-photo-overlay">
                      <div className="mg-photo-icon">
                        <i className="fas fa-expand" aria-hidden="true" />
                      </div>
                      {item.category_name && <div className="mg-photo-category">{item.category_name}</div>}
                      <h3 className="mg-photo-title">{item.title}</h3>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox for Photos */}
      <MediaLightbox
        photos={data.featuredPhotos || []}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={(idx) => setLightboxIndex(idx)}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={activeVideo}
        isOpen={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false)
          setActiveVideo(null)
        }}
      />
    </div>
  )
}
