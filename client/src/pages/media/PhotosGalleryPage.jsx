import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import { fetchPublicPhotos } from '../../api/mediaGalleryApi.js'
import MediaLightbox from './MediaLightbox.jsx'
import '../../styles/media-gallery.css'

export default function PhotosGalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'All Photos'
  const initialPhotoParam = searchParams.get('photo')

  const [photos, setPhotos] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasMore: false })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useDocumentMeta({
    title: 'G3B Photo Gallery — Student Life, Events & Campus Moments',
    description:
      'Take a closer look at G3B through photographs capturing our events, learning experiences, student interactions, workshops, counselling sessions, and achievements.',
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch photos when category, debounced search, or page change
  const loadPhotos = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const res = await fetchPublicPhotos({
        category: selectedCategory === 'All Photos' ? '' : selectedCategory,
        search: debouncedSearch,
        page: pageNum,
        perPage: 18,
      })

      const items = res.data || []
      const pag = res.pagination || { total: items.length, totalPages: 1, hasMore: false }
      const cats = res.categories || []

      setCategories(cats)
      setPagination(pag)

      if (append) {
        setPhotos((prev) => [...prev, ...items])
      } else {
        setPhotos(items)
      }

      // Check if photo URL param should open lightbox on initial load
      if (initialPhotoParam && !append && items.length > 0) {
        const foundIdx = items.findIndex(
          (p) => String(p.id) === initialPhotoParam || p.slug === initialPhotoParam
        )
        if (foundIdx >= 0) {
          setLightboxIndex(foundIdx)
          setLightboxOpen(true)
        }
      }
    } catch (err) {
      console.error('Failed to load photos:', err)
      setError('Unable to load photos right now. Please refresh or try again later.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, debouncedSearch, initialPhotoParam])

  useEffect(() => {
    loadPhotos(1, false)
  }, [loadPhotos])

  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName)
    setPage(1)
    const newParams = new URLSearchParams(searchParams)
    if (catName === 'All Photos') {
      newParams.delete('category')
    } else {
      newParams.set('category', catName)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadPhotos(nextPage, true)
  }

  const openLightbox = (index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
    const photo = photos[index]
    if (photo) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('photo', photo.slug || photo.id)
      setSearchParams(newParams, { replace: true })
    }
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('photo')
    setSearchParams(newParams, { replace: true })
  }

  const handleLightboxIndexChange = (newIdx) => {
    setLightboxIndex(newIdx)
    const photo = photos[newIdx]
    if (photo) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('photo', photo.slug || photo.id)
      setSearchParams(newParams, { replace: true })
    }
  }

  return (
    <div className="media-gallery-page">
      {/* 1. HERO SECTION */}
      <section className="mg-hero" aria-labelledby="photos-title">
        <div className="mg-hero-grid" aria-hidden="true" />
        <div className="mg-hero-glow" aria-hidden="true" />

        <div className="mg-hero-container">
          <nav className="mg-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <Link to="/about/media">Media Gallery</Link>
            <i className="fas fa-chevron-right fa-xs" aria-hidden="true" />
            <span aria-current="page">Photos</span>
          </nav>

          <div className="mg-eyebrow">
            <i className="fas fa-camera" aria-hidden="true" />
            <span>PHOTO ARCHIVE</span>
          </div>

          <h1 id="photos-title">G3B Photo Gallery</h1>

          <p className="mg-hero-desc">
            Take a closer look at G3B through photographs capturing our events, learning experiences, student interactions, workshops, counselling sessions, and achievements.
          </p>

          <div className="mg-hero-actions">
            <Link to="/about/media/videos" className="mg-btn-outline">
              <i className="fas fa-video" aria-hidden="true" />
              <span>Switch to Video Gallery</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. GALLERY CONTROLS & GRID */}
      <section className="mg-featured-section" aria-label="Photo Gallery Collection">
        <div className="container">
          {/* Toolbar: Category filter pills & Search */}
          <div className="mg-toolbar">
            <div className="mg-categories" role="tablist" aria-label="Photo Categories">
              <button
                type="button"
                className={`mg-cat-pill ${selectedCategory === 'All Photos' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('All Photos')}
                role="tab"
                aria-selected={selectedCategory === 'All Photos'}
              >
                All Photos
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
                placeholder="Search photos by title or keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search photos"
              />
            </div>
          </div>

          {/* Loading / Error / Empty / Grid States */}
          {loading ? (
            <div className="mg-empty-state">
              <i className="fas fa-circle-notch fa-spin fa-2x" aria-hidden="true" />
              <p style={{ marginTop: 12 }}>Loading photo gallery…</p>
            </div>
          ) : error ? (
            <div className="mg-empty-state">
              <i className="fas fa-triangle-exclamation fa-2x" style={{ color: '#ef4444' }} aria-hidden="true" />
              <p style={{ marginTop: 12, color: '#ef4444' }}>{error}</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="mg-empty-state">
              <i className="fas fa-images fa-3x" aria-hidden="true" />
              <p style={{ marginTop: 12, fontSize: '1.05rem', fontWeight: 600 }}>No photos found matching your criteria.</p>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Try adjusting your search query or selecting a different category.</p>
            </div>
          ) : (
            <>
              <div className="mg-photos-grid">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="mg-photo-card"
                    onClick={() => openLightbox(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openLightbox(idx)
                      }
                    }}
                    aria-label={`View photo: ${photo.title}`}
                  >
                    <img
                      src={photo.thumbnail_url || photo.media_url}
                      alt={photo.alt_text || photo.title}
                      loading="lazy"
                    />
                    <div className="mg-photo-overlay">
                      <div className="mg-photo-icon">
                        <i className="fas fa-expand" aria-hidden="true" />
                      </div>
                      {photo.category_name && (
                        <div className="mg-photo-category">{photo.category_name}</div>
                      )}
                      <h3 className="mg-photo-title">{photo.title}</h3>
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
                        <span>Loading more photos…</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus" aria-hidden="true" />
                        <span>Load More Photos ({pagination.total - photos.length} remaining)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      <MediaLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onIndexChange={handleLightboxIndexChange}
      />
    </div>
  )
}
