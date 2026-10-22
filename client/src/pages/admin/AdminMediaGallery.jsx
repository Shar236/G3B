import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchAdminMedia,
  fetchAdminMediaStats,
  createAdminMediaItem,
  bulkUploadAdminPhotos,
  updateAdminMediaItem,
  deleteAdminMediaItem,
  fetchMediaCategories,
} from '../../api/mediaGalleryApi.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import MediaLightbox from '../media/MediaLightbox.jsx'
import VideoPlayerModal from '../media/VideoPlayerModal.jsx'
import '../../styles/media-gallery.css'

export default function AdminMediaGallery() {
  const [activeTab, setActiveTab] = useState('photos') // 'photos' | 'videos'
  const [stats, setStats] = useState({
    publishedPhotos: 0,
    publishedVideos: 0,
    draftItems: 0,
    featuredItems: 0,
    diskUsage: '0 MB',
  })

  // Media list state
  const [mediaList, setMediaList] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Filters
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })

  // Modals
  const [editItem, setEditItem] = useState(null) // For editing photo or video
  const [isNewPhotoOpen, setIsNewPhotoOpen] = useState(false)
  const [isBulkPhotosOpen, setIsBulkPhotosOpen] = useState(false)
  const [isNewVideoOpen, setIsNewVideoOpen] = useState(false)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null)
  const [saving, setSaving] = useState(false)

  // Previews
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null)

  useDocumentMeta({ title: 'Media Gallery Manager — G3B Admin', robots: 'noindex,nofollow,noarchive' })

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const s = await fetchAdminMediaStats()
      if (s) setStats(s)
    } catch (err) {
      console.error('Failed to load media stats:', err)
    }
  }, [])

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const type = activeTab === 'photos' ? 'photo' : 'video'
      const cats = await fetchMediaCategories(type)
      setCategories(cats || [])
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }, [activeTab])

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const type = activeTab === 'photos' ? 'photo' : 'video'
      const res = await fetchAdminMedia({
        type,
        category: filterCategory,
        status: filterStatus,
        search: searchQuery.trim(),
        page,
        perPage: 24,
      })
      setMediaList(res.data || [])
      setPagination(res.pagination || { total: 0, totalPages: 1 })
    } catch (err) {
      console.error('Failed to load admin media:', err)
      setError('Failed to fetch media records. Please check database connection.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterCategory, filterStatus, searchQuery, page])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Reset pagination when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setFilterCategory('')
    setFilterStatus('')
    setSearchQuery('')
  }

  // Quick feature toggle
  const handleToggleFeatured = async (item) => {
    try {
      const newFeatured = !item.is_featured
      await updateAdminMediaItem(item.id, { is_featured: newFeatured })
      setMediaList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, is_featured: newFeatured } : m))
      )
      loadStats()
      setNotice({
        type: 'success',
        message: `"${item.title}" ${newFeatured ? 'marked as featured' : 'removed from featured'}.`,
      })
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to update featured status.' })
    }
  }

  // Quick publish/unpublish toggle
  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'published' ? 'draft' : 'published'
      await updateAdminMediaItem(item.id, { status: newStatus })
      setMediaList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, status: newStatus } : m))
      )
      loadStats()
      setNotice({
        type: 'success',
        message: `"${item.title}" status changed to ${newStatus}.`,
      })
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to update status.' })
    }
  }

  // Delete item handler
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return
    setSaving(true)
    try {
      await deleteAdminMediaItem(deleteConfirmItem.id)
      setMediaList((prev) => prev.filter((m) => m.id !== deleteConfirmItem.id))
      setNotice({ type: 'success', message: `Deleted "${deleteConfirmItem.title}" successfully.` })
      setDeleteConfirmItem(null)
      loadStats()
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete media item.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-media-gallery-module">
      {/* 1. OPERATIONAL DASHBOARD METRICS */}
      <div className="stat-cards" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">
            <i className="fas fa-camera" style={{ marginRight: 6, color: '#f47b35' }} />
            Published Photos
          </div>
          <div className="value">{stats.publishedPhotos ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <i className="fas fa-video" style={{ marginRight: 6, color: '#38bdf8' }} />
            Published Videos
          </div>
          <div className="value">{stats.publishedVideos ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <i className="fas fa-file-pen" style={{ marginRight: 6, color: '#f59e0b' }} />
            Drafts &amp; Unlisted
          </div>
          <div className="value">{stats.draftItems ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <i className="fas fa-star" style={{ marginRight: 6, color: '#eab308' }} />
            Featured Items
          </div>
          <div className="value">{stats.featuredItems ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <i className="fas fa-hard-drive" style={{ marginRight: 6, color: '#10b981' }} />
            Storage Footprint
          </div>
          <div className="value" style={{ fontSize: '1.25rem' }}>{stats.diskUsage || 'Local Uploads'}</div>
        </div>
      </div>

      {notice && (
        <div
          className={`admin-modal-notice alert ${
            notice.type === 'error' ? 'alert-danger' : 'alert-success'
          }`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
          }}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setNotice(null)}
            style={{ padding: '2px 8px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. MANAGEMENT HEADER & TABS */}
      <div className="admin-card">
        <div
          className="admin-card-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0b2c5f' }}>
              <i className="fas fa-photo-film" aria-hidden="true" style={{ marginRight: 8, color: '#f47b35' }} />
              Media Gallery Management
            </h2>

            {/* TAB PILLS */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 9999 }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'photos' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleTabSwitch('photos')}
                style={{ borderRadius: 9999, fontWeight: 700 }}
              >
                <i className="fas fa-images" style={{ marginRight: 6 }} />
                Photos ({stats.publishedPhotos ?? 0})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'videos' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleTabSwitch('videos')}
                style={{ borderRadius: 9999, fontWeight: 700 }}
              >
                <i className="fas fa-video" style={{ marginRight: 6 }} />
                Videos ({stats.publishedVideos ?? 0})
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS ACCORDING TO ACTIVE TAB */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {activeTab === 'photos' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsNewPhotoOpen(true)}
                >
                  <i className="fas fa-plus" style={{ marginRight: 6 }} />
                  Upload Photo
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsBulkPhotosOpen(true)}
                >
                  <i className="fas fa-layer-group" style={{ marginRight: 6 }} />
                  Bulk Upload Photos
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsNewVideoOpen(true)}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />
                Add Video
              </button>
            )}
          </div>
        </div>

        {/* 3. FILTER & SEARCH TOOLBAR */}
        <div
          className="admin-filter-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            padding: '16px 0',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
              Filter by Category
            </label>
            <select
              className="form-control"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setPage(1)
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
              Filter by Status
            </label>
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
              Search Title or Slug
            </label>
            <input
              type="search"
              placeholder="Search media…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* 4. CONTENT LISTING */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className="fas fa-circle-notch fa-spin fa-2x" />
            <p style={{ marginTop: 12 }}>Loading {activeTab}…</p>
          </div>
        ) : error ? (
          <StateBlock variant="error" title="Unable to load media" message={error} onRetry={loadItems} />
        ) : mediaList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className={`fas ${activeTab === 'photos' ? 'fa-images' : 'fa-video'} fa-3x`} style={{ color: '#cbd5e1' }} />
            <p style={{ marginTop: 14, fontWeight: 600 }}>No {activeTab} found matching your filters.</p>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8' }}>
              Upload new media using the buttons above or clear active filters.
            </p>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', width: 90 }}>Preview</th>
                  <th style={{ padding: '12px 14px' }}>Title &amp; Info</th>
                  <th style={{ padding: '12px 14px', width: 140 }}>Category</th>
                  <th style={{ padding: '12px 14px', width: 110 }}>Status</th>
                  <th style={{ padding: '12px 14px', width: 100 }}>Featured</th>
                  <th style={{ padding: '12px 14px', width: 130 }}>Date</th>
                  <th style={{ padding: '12px 14px', width: 160, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mediaList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    {/* Preview */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          width: 72,
                          height: 48,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#071e42',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          if (item.media_type === 'photo') {
                            setPreviewPhoto(item)
                          } else {
                            setPreviewVideo(item)
                          }
                        }}
                        title="Click to preview"
                      >
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {item.media_type === 'video' && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.3)',
                              display: 'grid',
                              placeItems: 'center',
                              color: '#fff',
                              fontSize: '0.85rem',
                            }}
                          >
                            <i className="fas fa-play" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title & Metadata */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0b2c5f', fontSize: '0.94rem' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                        slug: <code>{item.slug}</code>
                        {item.duration && (
                          <span style={{ marginLeft: 8, background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>
                            {item.duration}
                          </span>
                        )}
                        {item.storage_provider && (
                          <span style={{ marginLeft: 8, color: '#94a3b8' }}>
                            ({item.storage_provider})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '10px 14px', fontSize: '0.86rem' }}>
                      {item.category_name ? (
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 9px',
                            borderRadius: 9999,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        >
                          {item.category_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Uncategorized</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        style={{
                          border: 0,
                          cursor: 'pointer',
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: '0.74rem',
                          fontWeight: 750,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background:
                            item.status === 'published'
                              ? '#dcfce7'
                              : item.status === 'archived'
                              ? '#f1f5f9'
                              : '#fef3c7',
                          color:
                            item.status === 'published'
                              ? '#166534'
                              : item.status === 'archived'
                              ? '#475569'
                              : '#92400e',
                        }}
                        title={`Click to ${item.status === 'published' ? 'unpublish' : 'publish'}`}
                      >
                        {item.status}
                      </button>
                    </td>

                    {/* Featured Toggle */}
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleFeatured(item)}
                        style={{
                          color: item.is_featured ? '#eab308' : '#cbd5e1',
                          fontSize: '1.1rem',
                          padding: '4px 8px',
                        }}
                        title={item.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <i className={`${item.is_featured ? 'fas' : 'far'} fa-star`} />
                      </button>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Draft'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (item.media_type === 'photo') setPreviewPhoto(item)
                            else setPreviewVideo(item)
                          }}
                          title="Preview"
                          style={{ padding: '5px 8px' }}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setEditItem(item)}
                          title="Edit details"
                          style={{ padding: '5px 8px' }}
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirmItem(item)}
                          title="Delete media"
                          style={{ padding: '5px 8px' }}
                        >
                          <i className="fas fa-trash-can" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.86rem', color: '#64748b' }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* 5. MODAL: UPLOAD SINGLE PHOTO */}
      {isNewPhotoOpen && (
        <PhotoUploadModal
          categories={categories}
          onClose={() => setIsNewPhotoOpen(false)}
          onSuccess={(newItem) => {
            setIsNewPhotoOpen(false)
            setNotice({ type: 'success', message: `Photo "${newItem.title}" uploaded and published.` })
            loadItems()
            loadStats()
          }}
        />
      )}

      {/* 6. MODAL: BULK PHOTOS UPLOAD */}
      {isBulkPhotosOpen && (
        <BulkPhotosModal
          categories={categories}
          onClose={() => setIsBulkPhotosOpen(false)}
          onSuccess={(count) => {
            setIsBulkPhotosOpen(false)
            setNotice({ type: 'success', message: `Successfully uploaded ${count} photos in bulk.` })
            loadItems()
            loadStats()
          }}
        />
      )}

      {/* 7. MODAL: ADD VIDEO */}
      {isNewVideoOpen && (
        <VideoCreateModal
          categories={categories}
          onClose={() => setIsNewVideoOpen(false)}
          onSuccess={(newItem) => {
            setIsNewVideoOpen(false)
            setNotice({ type: 'success', message: `Video "${newItem.title}" added successfully.` })
            loadItems()
            loadStats()
          }}
        />
      )}

      {/* 8. MODAL: EDIT ITEM (Photo or Video) */}
      {editItem && (
        <MediaEditModal
          item={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSuccess={(updated) => {
            setEditItem(null)
            setNotice({ type: 'success', message: `Updated "${updated.title}" successfully.` })
            loadItems()
            loadStats()
          }}
        />
      )}

      {/* 9. MODAL: DELETE CONFIRMATION */}
      {deleteConfirmItem && (
        <Modal
          title="Confirm Deletion"
          onClose={() => setDeleteConfirmItem(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteItem}
                disabled={saving}
              >
                {saving ? 'Deleting…' : 'Delete Media'}
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <i className="fas fa-triangle-exclamation fa-3x" style={{ color: '#ef4444', marginBottom: 14 }} />
            <h4 style={{ color: '#0b2c5f', marginBottom: 8 }}>Are you sure you want to delete this media item?</h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              <strong>{deleteConfirmItem.title}</strong> will be permanently removed from the database and gallery.
            </p>
          </div>
        </Modal>
      )}

      {/* 10. PREVIEW LIGHTBOX & VIDEO MODAL */}
      <MediaLightbox
        photos={previewPhoto ? [previewPhoto] : []}
        currentIndex={0}
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
      />

      <VideoPlayerModal
        video={previewVideo}
        isOpen={Boolean(previewVideo)}
        onClose={() => setPreviewVideo(null)}
      />
    </div>
  )
}

/**
 * Single Photo Upload Modal Component
 */
function PhotoUploadModal({ categories, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [description, setDescription] = useState('')
  const [altText, setAltText] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [isFeatured, setIsFeatured] = useState(false)
  const [status, setStatus] = useState('published')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    if (!title) {
      // Auto-suggest clean title from file name
      const clean = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(clean.charAt(0).toUpperCase() + clean.slice(1))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select an image file to upload.')
      return
    }
    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('media_type', 'photo')
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('caption', caption.trim())
      formData.append('description', description.trim())
      formData.append('alt_text', altText.trim() || title.trim())
      if (categoryId) formData.append('category_id', categoryId)
      formData.append('is_featured', isFeatured ? '1' : '0')
      formData.append('status', status)

      const res = await createAdminMediaItem(formData)
      onSuccess(res.data)
    } catch (err) {
      setError(err.message || 'Failed to upload photo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="Upload Photo to Gallery"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Publish Photo'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: previewUrl ? '1fr 200px' : '1fr', gap: 20 }}>
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Select Image File *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileChange}
                required
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Supports JPEG, PNG, WebP up to 15MB.
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Photo Title *
              </label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Overseas Admissions Workshop 2026"
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Image Alt Text (Accessibility &amp; SEO)
              </label>
              <input
                type="text"
                className="form-control"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descriptive alt text for screen readers"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Caption / Short Description
              </label>
              <textarea
                rows={2}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Brief caption visible in lightbox"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="feat-checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="feat-checkbox" style={{ fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}>
                Feature this photo on the Main Media Gallery showcase
              </label>
            </div>
          </div>

          {previewUrl && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Live Preview
              </label>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

/**
 * Bulk Photos Upload Modal Component
 */
function BulkPhotosModal({ categories, onClose, onSuccess }) {
  const [files, setFiles] = useState([])
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [status, setStatus] = useState('published')
  const [isFeatured, setIsFeatured] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) {
      setError('Please select at least one photo to upload.')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(`Uploading ${files.length} photos…`)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('photos', file)
      })
      if (categoryId) formData.append('category_id', categoryId)
      formData.append('status', status)
      formData.append('is_featured', isFeatured ? '1' : '0')

      const res = await bulkUploadAdminPhotos(formData)
      onSuccess(res.data?.createdCount || files.length)
    } catch (err) {
      setError(err.message || 'Bulk upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="Bulk Upload Photos"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleBulkSubmit} disabled={uploading}>
            {uploading ? progress : `Upload ${files.length} Photos`}
          </button>
        </>
      }
    >
      <form onSubmit={handleBulkSubmit}>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Select Multiple Photos (Up to 20 images at once) *
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileChange}
            required
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Titles and slugs will be automatically formatted from filenames. You can edit individual details afterwards.
          </span>
        </div>

        {files.length > 0 && (
          <div
            style={{
              maxHeight: 140,
              overflowY: 'auto',
              background: '#f8fafc',
              padding: 10,
              borderRadius: 6,
              marginBottom: 16,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
              Selected Files ({files.length}):
            </div>
            {files.map((f, i) => (
              <div key={i} style={{ fontSize: '0.76rem', color: '#475569', padding: '2px 0' }}>
                {i + 1}. {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Default Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Publishing Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Add Video Modal Component (YouTube, Vimeo, or Direct Upload)
 */
function VideoCreateModal({ categories, onClose, onSuccess }) {
  const [sourceType, setSourceType] = useState('youtube') // 'youtube' | 'upload'
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [duration, setDuration] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [status, setStatus] = useState('published')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Auto-fetch YouTube thumbnail and video duration if possible
  const handleUrlBlur = () => {
    if (!videoUrl) return
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/)
    if (ytMatch && ytMatch[1] && !thumbnailUrl) {
      setThumbnailUrl(`https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Video title is required.')
      return
    }

    if (sourceType === 'youtube' && !videoUrl.trim()) {
      setError('Please provide a valid YouTube or Vimeo URL.')
      return
    }

    if (sourceType === 'upload' && !videoFile) {
      setError('Please select an MP4 video file to upload.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (sourceType === 'upload' || thumbFile) {
        // Multi-part form
        const formData = new FormData()
        formData.append('media_type', 'video')
        formData.append('title', title.trim())
        formData.append('description', description.trim())
        if (categoryId) formData.append('category_id', categoryId)
        if (duration) formData.append('duration', duration.trim())
        formData.append('is_featured', isFeatured ? '1' : '0')
        formData.append('status', status)
        if (videoFile) formData.append('file', videoFile)
        if (thumbFile) formData.append('thumbnail', thumbFile)
        if (videoUrl) formData.append('external_video_url', videoUrl.trim())
        if (thumbnailUrl) formData.append('thumbnail_url', thumbnailUrl.trim())

        const res = await createAdminMediaItem(formData)
        onSuccess(res.data)
      } else {
        // JSON payload
        const payload = {
          media_type: 'video',
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          external_video_url: videoUrl.trim(),
          thumbnail_url: thumbnailUrl.trim() || undefined,
          duration: duration.trim() || undefined,
          is_featured: isFeatured,
          status,
        }
        const res = await createAdminMediaItem(payload)
        onSuccess(res.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to save video.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add Video to Gallery"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving Video…' : 'Publish Video'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Source selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Video Source
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="sourceType"
                checked={sourceType === 'youtube'}
                onChange={() => setSourceType('youtube')}
              />
              <span>YouTube / Vimeo URL (Recommended)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="sourceType"
                checked={sourceType === 'upload'}
                onChange={() => setSourceType('upload')}
              />
              <span>Upload MP4 Video File</span>
            </label>
          </div>
        </div>

        {sourceType === 'youtube' ? (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              YouTube or Vimeo Link *
            </label>
            <input
              type="url"
              className="form-control"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Supports YouTube standard videos, Shorts, and Vimeo embeds.
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Select Video File (.mp4, .webm) *
            </label>
            <input
              type="file"
              accept="video/mp4,video/webm"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              required
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Video Title *
          </label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Masterclass: Navigating Ivy League Admissions"
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Duration
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 14:20"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Custom Thumbnail URL (optional)
          </label>
          <input
            type="url"
            className="form-control"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Auto-detected from YouTube or enter image URL"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the guidance session, workshop, or student story."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="video-feat-checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="video-feat-checkbox" style={{ fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}>
            Feature this video on the Main Media Gallery showcase
          </label>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Edit Media Item Modal Component
 */
function MediaEditModal({ item, categories, onClose, onSuccess }) {
  const [title, setTitle] = useState(item.title || '')
  const [caption, setCaption] = useState(item.caption || '')
  const [description, setDescription] = useState(item.description || '')
  const [altText, setAltText] = useState(item.alt_text || '')
  const [categoryId, setCategoryId] = useState(item.category_id || '')
  const [duration, setDuration] = useState(item.duration || '')
  const [externalVideoUrl, setExternalVideoUrl] = useState(item.external_video_url || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail_url || '')
  const [isFeatured, setIsFeatured] = useState(Boolean(item.is_featured))
  const [status, setStatus] = useState(item.status || 'published')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title cannot be empty.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        caption: caption.trim(),
        description: description.trim(),
        alt_text: altText.trim(),
        category_id: categoryId || null,
        duration: duration.trim() || undefined,
        external_video_url: externalVideoUrl.trim() || undefined,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        is_featured: isFeatured,
        status,
      }
      const res = await updateAdminMediaItem(item.id, payload)
      onSuccess(res.data)
    } catch (err) {
      setError(err.message || 'Failed to update media.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Edit ${item.media_type === 'video' ? 'Video' : 'Photo'}: ${item.title}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
            {saving ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form onSubmit={handleUpdate}>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Title *
          </label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {item.media_type === 'video' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                  External Video URL
                </label>
                <input
                  type="url"
                  className="form-control"
                  value={externalVideoUrl}
                  onChange={(e) => setExternalVideoUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                  Duration
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Thumbnail URL
              </label>
              <input
                type="url"
                className="form-control"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Image Alt Text
              </label>
              <input
                type="text"
                className="form-control"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
                Caption
              </label>
              <input
                type="text"
                className="form-control"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: 6 }}>
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="edit-feat-checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="edit-feat-checkbox" style={{ fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}>
            Featured item in showcase
          </label>
        </div>
      </form>
    </Modal>
  )
}
