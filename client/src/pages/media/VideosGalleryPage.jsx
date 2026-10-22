import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import { fetchPublicVideos } from '../../api/mediaGalleryApi.js'
import VideoPlayerModal from './VideoPlayerModal.jsx'
import '../../styles/media-gallery.css'

export default function VideosGalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'All Videos'
  const initialVideoParam = searchParams.get('video')

  const [videos, setVideos] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasMore: false })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  // Video player modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  useDocumentMeta({
    title: 'Watch the G3B Story — Video Gallery & Insights',
    description:
      'Discover G3B through videos featuring our activities, student experiences, educational guidance, events, workshops, and insights into studying abroad.',
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load videos
  const loadVideos = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const res = await fetchPublicVideos({
        category: selectedCategory === 'All Videos' ? '' : selectedCategory,
        search: debouncedSearch,
        page: pageNum,
        perPage: 12,
      })

      const items = res.data || []
      const pag = res.pagination || { total: items.length, totalPages: 1, hasMore: false }
      const cats = res.categories || []

      setCategories(cats)
      setPagination(pag)

      if (append) {
        setVideos((prev) => [...prev, ...items])
      } else {
        setVideos(items)
      }

      // Check if video URL param should open modal on initial load
      if (initialVideoParam && !append && items.length > 0) {
        const found = items.find(
          (v) => String(v.id) === initialVideoParam || v.slug === initialVideoParam
        )
        if (found) {
          setActiveVideo(found)
          setVideoModalOpen(true)
        }
      }
    } catch (err) {
      console.error('Failed to load videos:', err)
      setError('Unable to load videos right now. Please refresh or try again later.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, debouncedSearch, initialVideoParam])

  useEffect(() => {
    loadVideos(1, false)
  }, [loadVideos])

  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName)
    setPage(1)
    const newParams = new URLSearchParams(searchParams)
    if (catName === 'All Videos') {
      newParams.delete('category')
    } else {
      newParams.set('category', catName)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadVideos(nextPage, true)
  }

  const openVideo = (video) => {
    setActiveVideo(video)
    setVideoModalOpen(true)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('video', video.slug || video.id)
    setSearchParams(newParams, { replace: true })
  }

  const closeVideo = () => {
    setVideoModalOpen(false)
    setActiveVideo(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('video')
    setSearchParams(newParams, { replace: true })
  }

  return (
    <div className="media-gallery-page">
      {/* 1. HERO SECTION */}
      <section className="mg-hero" aria-labelledby="videos-title">
        <div className="mg-hero-grid" aria-hidden="true" />
        <div className="mg-hero-glow" aria-hidden="true" />

        <div className="mg-hero-container">
          <nav className="mg-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <Link to="/about/media">Media Gallery</Link>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <span aria-current="page">Videos</span>
          </nav>

          <div className="mg-eyebrow">
            <i className="fas fa-play-circle" aria-hidden="true" />
            <span>VIDEO REEL</span>
          </div>

          <h1 id="videos-title">Watch the G3B Story</h1>

          <p className="mg-hero-desc">
            Discover G3B through videos featuring our activities, student experiences, educational guidance, events, workshops, and insights into studying abroad.
          </p>

          <div className="mg-hero-actions">
            <Link to="/about/media/photos" className="mg-btn-outline">
              <i className="fas fa-images" aria-hidden="true" />
              <span>Switch to Photo Gallery</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. GALLERY CONTROLS & GRID */}
      <section className="mg-featured-section" aria-label="Video Gallery Collection">
        <div className="container">
          {/* Toolbar: Category filter pills & Search */}
          <div className="mg-toolbar">
            <div className="mg-categories" role="tablist" aria-label="Video Categories">
              <button
                type="button"
                className={`mg-cat-pill ${selectedCategory === 'All Videos' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('All Videos')}
                role="tab"
                aria-selected={selectedCategory === 'All Videos'}
              >
                All Videos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`mg-cat-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat.name)}
                  role="tab"
                  aria-selected={selectedCategory === cat.name}
                >
                  <span>{cat.name}</span>
                  <span className="mg-cat-count">{cat.publishedCount}</span>
                </button>
              ))}
            </div>

            <div className="mg-search-wrap">
              <i className="fas fa-search mg-search-icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search videos by title or topic…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search videos"
              />
            </div>
          </div>

          {/* Loading / Error / Empty / Grid States */}
          {loading ? (
            <div className="mg-empty-state">
              <i className="fas fa-circle-notch fa-spin fa-2x" aria-hidden="true" />
              <p style={{ marginTop: 12 }}>Loading video gallery…</p>
            </div>
          ) : error ? (
            <div className="mg-empty-state">
              <i className="fas fa-triangle-exclamation fa-2x" style={{ color: '#ef4444' }} aria-hidden="true" />
              <p style={{ marginTop: 12, color: '#ef4444' }}>{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="mg-empty-state">
              <i className="fas fa-video-slash fa-3x" aria-hidden="true" />
              <p style={{ marginTop: 12, fontSize: '1.05rem', fontWeight: 600 }}>No videos found matching your criteria.</p>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Try searching another keyword or selecting a different category.</p>
            </div>
          ) : (
            <>
              <div className="mg-videos-grid">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="mg-video-card"
                    onClick={() => openVideo(video)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openVideo(video)
                      }
                    }}
                    aria-label={`Play video: ${video.title}`}
                  >
                    <div className="mg-video-thumb">
                      <img
                        src={video.thumbnail_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'}
                        alt={video.title}
                        loading="lazy"
                      />
                      <div className="mg-video-play" aria-hidden="true">
                        <i className="fas fa-play" />
                      </div>
                      {video.is_featured ? (
                        <div className="mg-video-featured-badge">Featured</div>
                      ) : null}
                      {video.duration ? (
                        <div className="mg-video-duration">{video.duration}</div>
                      ) : null}
                    </div>
                    <div className="mg-video-info">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        {video.category_name && (
                          <div className="mg-video-cat" style={{ marginBottom: 0 }}>{video.category_name}</div>
                        )}
                        {video.published_at && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(video.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <h3 className="mg-video-title">{video.title}</h3>
                      {video.description && (
                        <p className="mg-video-desc">{video.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {pagination.hasMore && (
                <div className="mg-load-more">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                        <span>Loading more videos…</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus" aria-hidden="true" />
                        <span>Load More Videos ({pagination.total - videos.length} remaining)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Responsive Video Modal */}
      <VideoPlayerModal
        video={activeVideo}
        isOpen={videoModalOpen}
        onClose={closeVideo}
      />
    </div>
  )
}
