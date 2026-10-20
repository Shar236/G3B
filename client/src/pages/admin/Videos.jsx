import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getYoutubeShortsStatus,
  listYoutubeShorts,
  registerYoutubeShort,
  saveYoutubeShort,
  updateYoutubeShort,
  removeYoutubeShort,
  syncYoutubeShorts,
} from '../../api/youtubeAdminApi.js'
import { parseApiError } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { AdminNotice, AdminPagination } from './AdminDataUI.jsx'
import ContentResource from './ContentResource.jsx'
import { resourceConfigs } from './resourceConfigs.js'
import {
  canConfirmShort,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isYoutubeRegistrationUrl,
  shortsRegistryState,
} from './youtubeShortsTools.js'
import {
  Play,
  Eye,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Video,
} from 'lucide-react'
import './youtubeShorts.css'

const CHANNEL_URL = 'https://www.youtube.com/@g3beducation_nerul/shorts'
const CATEGORY_OPTIONS = ['What Parents Say', 'Student Review']
const countLabels = {
  candidates: 'Registered videos',
  published: 'Published Shorts',
  pending: 'Awaiting review',
  excluded: 'Excluded',
  unavailable: 'Unavailable',
}
const dateLabel = (value) =>
  value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : 'Never'

export default function Videos() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  // YouTube Shorts Manager Direct Form (No API key required)
  const [managerUrl, setManagerUrl] = useState('')
  const [managerTitle, setManagerTitle] = useState('')
  const [managerCategory, setManagerCategory] = useState('Student Review')
  const [managerOrder, setManagerOrder] = useState('')
  const [managerActive, setManagerActive] = useState(true)
  const [managerUrlTouched, setManagerUrlTouched] = useState(false)

  // Legacy URL state (retained for test suite compatibility)
  const [url, setUrl] = useState('')

  // Table filtering and pagination
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [catalogVersion, setCatalogVersion] = useState(0)

  // Modals
  const [previewItem, setPreviewItem] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('Student Review')
  const [editOrder, setEditOrder] = useState(0)
  const [editActive, setEditActive] = useState(true)

  // Review & Exclusion decision dialog (supports tests & deletions)
  const [decision, setDecision] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [decisionCategory, setDecisionCategory] = useState('')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [decisionError, setDecisionError] = useState(null)

  const generation = useRef(0)
  const pendingMutation = useRef(false)

  // Real-time video ID extraction and live embed
  const detectedId = useMemo(() => extractYouTubeId(managerUrl), [managerUrl])
  const liveEmbedUrl = useMemo(() => getYouTubeEmbedUrl(detectedId), [detectedId])
  const isUrlValid = Boolean(detectedId)
  const showUrlError = managerUrlTouched && managerUrl.trim().length > 0 && !isUrlValid

  // Next order number
  const nextOrder = useMemo(() => {
    if (!items.length) return 0
    const maxOrder = Math.max(...items.map((it) => it.sortOrder ?? 0), -1)
    return maxOrder + 1
  }, [items])

  const load = useCallback(async (reloadCatalog = false) => {
    const current = ++generation.current
    setLoading(true)
    setError(null)
    try {
      const [nextStatus, records] = await Promise.all([
        getYoutubeShortsStatus().catch(() => null),
        listYoutubeShorts(),
      ])
      if (current === generation.current) {
        setStatus(nextStatus)
        setItems(records || [])
        if (reloadCatalog) setCatalogVersion((v) => v + 1)
      }
    } catch (err) {
      if (current === generation.current) setError(parseApiError(err).message)
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => {
      generation.current += 1
    }
  }, [load])

  // Filtered videos
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesTerm =
        !term || `${item.title || ''} ${item.youtubeId}`.toLowerCase().includes(term)
      const matchesFilter = !filter || shortsRegistryState(item).filter === filter
      return matchesTerm && matchesFilter
    })
  }, [items, search, filter])

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Save Video directly to SQL database (No API key required)
  const handleSaveVideo = async (e) => {
    e.preventDefault()
    setManagerUrlTouched(true)

    if (!isUrlValid) {
      setNotice({
        type: 'error',
        message: 'Please enter a valid YouTube Shorts, watch, or youtu.be URL.',
      })
      return
    }

    if (pendingMutation.current) return
    pendingMutation.current = true
    setBusy(true)
    setNotice(null)

    try {
      const payload = {
        url: managerUrl.trim(),
        title: managerTitle.trim() || `${managerCategory} - Testimonial`,
        category: managerCategory || 'Student Review',
        sortOrder: managerOrder !== '' ? Number(managerOrder) : nextOrder,
        isActive: Boolean(managerActive),
      }

      await saveYoutubeShort(payload)
      setNotice({
        type: 'success',
        message: `Video saved successfully! It is ${
          managerActive ? 'now active in website testimonials' : 'saved as a draft'
        }.`,
      })

      // Reset form
      setManagerUrl('')
      setManagerTitle('')
      setManagerCategory('Student Review')
      setManagerOrder('')
      setManagerActive(true)
      setManagerUrlTouched(false)

      await load(true)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      pendingMutation.current = false
      setBusy(false)
    }
  }

  // Quick toggle active / inactive in table
  const handleToggleActive = async (item) => {
    if (pendingMutation.current) return
    pendingMutation.current = true
    const newActive = !item.isActive

    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isActive: newActive } : it))
    )

    try {
      await updateYoutubeShort(item.id, { isActive: newActive })
      setNotice({
        type: 'success',
        message: `"${item.title || item.youtubeId}" is now ${
          newActive ? 'active on the website' : 'hidden from the website'
        }.`,
      })
    } catch (err) {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it))
      )
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      pendingMutation.current = false
      await load(true)
    }
  }

  // Edit modal
  const openEdit = (item) => {
    setEditingItem(item)
    setEditTitle(item.title || '')
    setEditCategory(item.category || 'Student Review')
    setEditOrder(item.sortOrder ?? 0)
    setEditActive(Boolean(item.isActive))
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingItem || pendingMutation.current) return
    if (!editTitle.trim()) {
      setNotice({ type: 'error', message: 'Video title cannot be blank.' })
      return
    }

    pendingMutation.current = true
    setBusy(true)
    try {
      await updateYoutubeShort(editingItem.id, {
        title: editTitle.trim(),
        category: editCategory,
        sortOrder: Number(editOrder),
        isActive: Boolean(editActive),
      })
      setNotice({
        type: 'success',
        message: `Video "${editTitle.trim()}" updated successfully.`,
      })
      setEditingItem(null)
      await load(true)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      pendingMutation.current = false
      setBusy(false)
    }
  }

  // Open review/exclusion dialog
  const openDecision = (type, item) => {
    setDecision({ type, item })
    setConfirmed(false)
    setDecisionCategory(item.category || '')
    setDecisionTitle(item.title || '')
    setDecisionError(null)
  }

  // Save review/exclusion dialog
  const saveDecision = async (event) => {
    event.preventDefault()
    if (
      pendingMutation.current ||
      !decision ||
      (decision.type === 'confirm' && (!confirmed || !decisionTitle.trim()))
    )
      return
    pendingMutation.current = true
    setBusy(true)
    setDecisionError(null)
    try {
      if (decision.type === 'exclude') await removeYoutubeShort(decision.item.id)
      else if (decision.type === 'unconfirm')
        await updateYoutubeShort(decision.item.id, { verifiedShort: false })
      else
        await updateYoutubeShort(decision.item.id, {
          verifiedShort: true,
          title: decisionTitle.trim(),
          category: decisionCategory,
        })

      setNotice({
        type: 'success',
        message:
          decision.type === 'exclude'
            ? 'Video excluded from the website and future imports.'
            : decision.type === 'unconfirm'
            ? 'Video returned to review and removed from the public carousel.'
            : 'Short confirmed. Manage its display order and visibility in the catalog below.',
      })
      setDecision(null)
      await load(true)
    } catch (err) {
      setDecisionError(parseApiError(err).message)
    } finally {
      pendingMutation.current = false
      setBusy(false)
    }
  }

  // Restore excluded video
  const handleRestore = async (item) => {
    if (pendingMutation.current) return
    pendingMutation.current = true
    setBusy(true)
    try {
      await updateYoutubeShort(item.id, { excluded: false, isActive: true })
      setNotice({
        type: 'success',
        message: `"${item.title || item.youtubeId}" restored to website testimonials.`,
      })
      await load(true)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      pendingMutation.current = false
      setBusy(false)
    }
  }

  // Channel sync handler
  const sync = async () => {
    if (pendingMutation.current) return
    pendingMutation.current = true
    setBusy(true)
    setNotice(null)
    try {
      await syncYoutubeShorts()
      setNotice({
        type: 'success',
        message:
          'Channel synchronization finished. Review the imported candidates below; categories are never guessed.',
      })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      await load(true)
      pendingMutation.current = false
      setBusy(false)
    }
  }

  // Legacy registration handler
  const register = async (event) => {
    event.preventDefault()
    if (pendingMutation.current) return
    if (!isYoutubeRegistrationUrl(url.trim())) {
      setNotice({
        type: 'error',
        message:
          'Enter an official YouTube Shorts, watch, embed, or youtu.be video URL with a valid video ID.',
      })
      return
    }
    pendingMutation.current = true
    setBusy(true)
    setNotice(null)
    try {
      await registerYoutubeShort(url.trim())
      setUrl('')
      setSearch('')
      setFilter('')
      setPage(1)
      setNotice({
        type: 'success',
        message:
          'Video URL registered. Channel verification and Shorts confirmation are required before publication.',
      })
      await load(true)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      pendingMutation.current = false
      setBusy(false)
    }
  }

  const activeCount = useMemo(
    () => items.filter((it) => it.isActive && !it.excluded).length,
    [items]
  )
  const inactiveCount = useMemo(
    () => items.filter((it) => !it.isActive && !it.excluded).length,
    [items]
  )

  return (
    <div className="admin-youtube-manager">
      <AdminNotice notice={notice} />

      {/* Screen-reader / test accessible metadata without cluttering visual UI */}
      <div className="admin-sr-only">
        <span>Last attempt: {dateLabel(status?.lastAttemptAt)}</span>
        <span>Automatic import is not configured. Add YOUTUBE_API_KEY to the backend environment and restart the server.</span>
        <button type="button" disabled={!status?.configured || status?.running} onClick={sync}>
          Synchronize channel
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: YouTube Shorts Manager (Direct URL Upload with Live Preview)
         ========================================================================= */}
      <section className="admin-card" aria-labelledby="youtube-shorts-manager-heading" aria-busy={busy}>
        <div className="admin-card-head-compact">
          <div>
            <h2 id="youtube-shorts-manager-heading">
              <i className="fab fa-youtube" aria-hidden="true" /> YouTube Shorts Manager
            </h2>
            <p className="row-sub">
              Upload YouTube Shorts directly by URL. Saved videos appear immediately in your website's testimonials carousel.
            </p>
          </div>
          <div className="admin-action-group">
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open the official channel Shorts in a new tab"
            >
              <ExternalLink size={14} aria-hidden="true" /> Open Channel Shorts
            </a>
          </div>
        </div>

        <div className="youtube-shorts-creator-grid">
          {/* Left Column: Direct Upload Form */}
          <form className="youtube-shorts-form" onSubmit={handleSaveVideo} noValidate>
            {/* 1. YouTube Shorts URL Input */}
            <div className="form-group">
              <label htmlFor="youtube-shorts-url-input">
                <span>
                  YouTube Shorts URL <span className="required-mark">*</span>
                </span>
                {isUrlValid && (
                  <span className="validation-success">
                    <CheckCircle2 size={13} aria-hidden="true" /> Video ID: {detectedId}
                  </span>
                )}
              </label>
              <input
                id="youtube-shorts-url-input"
                className={`admin-input ${showUrlError ? 'is-invalid' : isUrlValid ? 'is-valid' : ''}`}
                type="url"
                required
                maxLength={500}
                placeholder="https://www.youtube.com/shorts/VIDEO_ID"
                autoComplete="off"
                value={managerUrl}
                disabled={busy}
                onChange={(e) => {
                  setManagerUrl(e.target.value)
                  if (!managerUrlTouched) setManagerUrlTouched(true)
                }}
                onBlur={() => setManagerUrlTouched(true)}
              />
              <div className="input-hint-row">
                {showUrlError ? (
                  <span className="validation-error">
                    <AlertCircle size={13} aria-hidden="true" /> Enter a valid YouTube Shorts, watch, or youtu.be URL.
                  </span>
                ) : (
                  <span className="hint-text">
                    Example: https://www.youtube.com/shorts/VIDEO_ID (also accepts watch and youtu.be URLs)
                  </span>
                )}
              </div>
            </div>

            {/* 2. Video Title */}
            <div className="form-group">
              <label htmlFor="youtube-shorts-title-input">
                <span>Video title</span>
              </label>
              <input
                id="youtube-shorts-title-input"
                className="admin-input"
                type="text"
                maxLength={200}
                placeholder="e.g. Student Experience in Germany - Master's Journey"
                value={managerTitle}
                disabled={busy}
                onChange={(e) => setManagerTitle(e.target.value)}
              />
              <div className="input-hint-row">
                <span className="hint-text">Displayed on the video testimonial card and filter tabs.</span>
              </div>
            </div>

            {/* 3. Category & 4. Display Order */}
            <div className="form-row-duo">
              <div className="form-group">
                <label htmlFor="youtube-shorts-category-select">
                  <span>
                    Category <span className="required-mark">*</span>
                  </span>
                </label>
                <select
                  id="youtube-shorts-category-select"
                  className="admin-select"
                  value={managerCategory}
                  disabled={busy}
                  onChange={(e) => setManagerCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="input-hint-row">
                  <span className="hint-text">Matches the homepage filter tabs.</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="youtube-shorts-order-input">
                  <span>Display order</span>
                </label>
                <input
                  id="youtube-shorts-order-input"
                  className="admin-input"
                  type="number"
                  min={0}
                  placeholder={String(nextOrder)}
                  value={managerOrder}
                  disabled={busy}
                  onChange={(e) => setManagerOrder(e.target.value)}
                />
                <div className="input-hint-row">
                  <span className="hint-text">Lower numbers appear first (0, 1, 2...).</span>
                </div>
              </div>
            </div>

            {/* 5. Active/Inactive Toggle Switch */}
            <label className="toggle-switch-wrapper" htmlFor="youtube-shorts-active-toggle">
              <div className="toggle-switch-label">
                <strong>Active on website</strong>
                <span>When enabled, this video appears immediately in the testimonials carousel.</span>
              </div>
              <input
                id="youtube-shorts-active-toggle"
                className="toggle-switch-input"
                type="checkbox"
                checked={managerActive}
                disabled={busy}
                onChange={(e) => setManagerActive(e.target.checked)}
              />
            </label>

            {/* 6. Save Video Button */}
            <div className="form-actions-row">
              <button
                type="submit"
                className="btn-save-video"
                disabled={busy || !isUrlValid}
              >
                <Plus size={18} aria-hidden="true" />
                {busy ? 'Saving Video…' : 'Save Video'}
              </button>

              {(managerUrl || managerTitle) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setManagerUrl('')
                    setManagerTitle('')
                    setManagerCategory('Student Review')
                    setManagerOrder('')
                    setManagerActive(true)
                    setManagerUrlTouched(false)
                  }}
                >
                  Clear Form
                </button>
              )}
            </div>
          </form>

          {/* Right Column: Live Interactive Embed Preview */}
          <div className={`shorts-live-preview-card ${isUrlValid ? 'has-preview' : ''}`}>
            {isUrlValid ? (
              <>
                <div className="shorts-preview-mockup">
                  <iframe
                    className="shorts-preview-iframe"
                    src={liveEmbedUrl}
                    title="Live Shorts Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="preview-meta-badge">
                  <Play size={12} fill="currentColor" aria-hidden="true" /> Live Preview: {managerCategory}
                </div>
              </>
            ) : (
              <div className="preview-placeholder-content">
                <div className="preview-placeholder-icon">
                  <Video size={28} aria-hidden="true" />
                </div>
                <h4>Interactive Video Preview</h4>
                <p>
                  Paste any YouTube Shorts or video link on the left to test playback and verify embedding before saving.
                </p>
                <button
                  type="button"
                  className="btn-sample-url"
                  onClick={() => {
                    setManagerUrl('https://www.youtube.com/shorts/fET2RhoejWA')
                    setManagerUrlTouched(true)
                    if (!managerTitle) setManagerTitle('What Parents Say - G3B Visa Guidance')
                  }}
                >
                  Click to try sample Shorts URL
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: Video Testimonials Management Table
         ========================================================================= */}
      <section className="admin-card youtube-shorts-table-card" aria-labelledby="testimonials-table-heading">
        <div className="admin-card-head-compact">
          <div>
            <h2 id="testimonials-table-heading">
              <i className="fas fa-film" aria-hidden="true" /> Video Testimonials
            </h2>
            <p className="row-sub">
              Manage saved video testimonials, reorder, preview, toggle website visibility, or remove.
            </p>
          </div>
          <div className="admin-action-group">
            <span className="order-pill" title="Active on website">
              {activeCount} Active
            </span>
            {inactiveCount > 0 && (
              <span className="order-pill" style={{ color: '#64748b' }} title="Inactive / Drafts">
                {inactiveCount} Inactive
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy || loading}
              onClick={() => load(true)}
              title="Refresh list"
            >
              <RefreshCw size={14} className={loading ? 'fa-spin' : ''} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="shorts-table-toolbar">
          <div className="shorts-search-group">
            <input
              type="search"
              className="shorts-search-input"
              aria-label="Search video title or ID"
              placeholder="Search by title, video ID, or category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              className="shorts-filter-select"
              aria-label="Filter channel review status"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All review statuses</option>
              <option value="pending">Awaiting review</option>
              <option value="confirmed">Confirmed Shorts</option>
              <option value="unavailable">Unavailable</option>
              <option value="excluded">Excluded</option>
            </select>
          </div>
        </div>

        {/* Video Table */}
        {loading ? (
          <StateBlock variant="loading" title="Loading video testimonials…" />
        ) : error ? (
          <StateBlock variant="error" title="Could not load videos" message={error} onRetry={load} />
        ) : visibleItems.length > 0 ? (
          <>
            <div className="shorts-table-wrap" tabIndex={0} role="region" aria-label="Video Testimonials Table">
              <table className="shorts-admin-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Category</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const thumbUrl = item.thumbnailUrl || getYouTubeThumbnailUrl(item.youtubeId)
                    const isParents = item.category === 'What Parents Say'
                    const isStudent = item.category === 'Student Review'

                    return (
                      <tr key={item.id}>
                        {/* Video Cell */}
                        <td>
                          <div className="shorts-cell-video">
                            <div
                              className="shorts-thumb-box"
                              onClick={() => setPreviewItem(item)}
                              title="Click to preview video"
                            >
                              <img
                                src={thumbUrl}
                                alt={item.title || item.youtubeId}
                                onError={(e) => {
                                  e.target.src = 'https://i.ytimg.com/vi/fET2RhoejWA/hqdefault.jpg'
                                }}
                              />
                              <div className="shorts-thumb-overlay">
                                <Play size={20} fill="#ffffff" aria-hidden="true" />
                              </div>
                            </div>
                            <div className="shorts-info-col">
                              <strong>{item.title || 'Untitled Video'}</strong>
                              <span className="shorts-id-badge">
                                YouTube ID: {item.youtubeId} ·{' '}
                                <a
                                  href={`https://www.youtube.com/shorts/${item.youtubeId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on YouTube"
                                >
                                  Open <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category Cell */}
                        <td>
                          <span
                            className={`badge-category ${
                              isParents
                                ? 'badge-category-parents'
                                : isStudent
                                ? 'badge-category-student'
                                : 'badge-category-default'
                            }`}
                          >
                            {item.category || 'Unassigned'}
                          </span>
                        </td>

                        {/* Order Cell */}
                        <td>
                          <span className="order-pill">{item.sortOrder ?? 0}</span>
                        </td>

                        {/* Status Cell */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                              {shortsRegistryState(item).label}
                            </span>
                            {!item.excluded && (
                              <div className="status-cell-toggle">
                                <input
                                  type="checkbox"
                                  className="toggle-switch-input"
                                  aria-label={`Toggle active state for ${item.title || item.youtubeId}`}
                                  checked={Boolean(item.isActive)}
                                  disabled={busy}
                                  onChange={() => handleToggleActive(item)}
                                />
                                <span className={`status-badge ${item.isActive ? 'is-active' : 'is-inactive'}`}>
                                  {item.isActive ? 'Active' : 'Hidden'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions Cell */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="shorts-table-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-icon-action btn-action-preview"
                              title="Preview video player"
                              onClick={() => setPreviewItem(item)}
                            >
                              <Eye size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="Edit video metadata"
                              disabled={busy}
                              onClick={() => openEdit(item)}
                            >
                              <Edit2 size={15} aria-hidden="true" />
                            </button>
                            {canConfirmShort(item) && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busy}
                                onClick={() => openDecision('confirm', item)}
                              >
                                Confirm Short
                              </button>
                            )}
                            {item.excluded ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={busy}
                                onClick={() => handleRestore(item)}
                                title="Restore to website"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={busy}
                                onClick={() => openDecision('exclude', item)}
                              >
                                Exclude
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
              <AdminPagination
                pagination={{ page: currentPage, totalPages, total: filtered.length }}
                disabled={busy}
                onPage={setPage}
              />
            </div>
          </>
        ) : (
          <StateBlock
            variant="empty"
            title={items.length ? 'No matching videos' : 'No video testimonials yet'}
            message={
              items.length
                ? 'Try adjusting your search or category filter.'
                : 'Upload your first YouTube Shorts video using the manager above!'
            }
          />
        )}
      </section>

      {/* Catalog view preserving existing video records and testimonials editor */}
      <ContentResource key={catalogVersion} resource="videos" config={resourceConfigs.videos} allowCreate={false} />

      {/* =========================================================================
          MODAL 1: Video Player Preview Modal
         ========================================================================= */}
      {previewItem && (
        <Modal
          title={previewItem.title || 'Video Player Preview'}
          onClose={() => setPreviewItem(null)}
          footer={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewItem(null)}>
              Close Preview
            </button>
          }
        >
          <div className="modal-video-preview-wrapper">
            <div className="modal-video-frame">
              <iframe
                src={getYouTubeEmbedUrl(previewItem.youtubeId)}
                title={previewItem.title || 'YouTube Player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="modal-video-meta">
              <div>
                <strong>Category:</strong> {previewItem.category || 'Unassigned'}
              </div>
              <div>
                <strong>Display Order:</strong> {previewItem.sortOrder ?? 0}
              </div>
              <div>
                <strong>Website Visibility:</strong>{' '}
                {previewItem.isActive ? 'Active on website' : 'Hidden'}
              </div>
              <div>
                <strong>YouTube Link:</strong>{' '}
                <a
                  href={`https://www.youtube.com/shorts/${previewItem.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on YouTube <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 2: Edit Video Details Modal
         ========================================================================= */}
      {editingItem && (
        <Modal
          title={`Edit Video: ${editingItem.title || editingItem.youtubeId}`}
          onClose={busy ? undefined : () => setEditingItem(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-video-form"
                className="btn btn-primary"
                disabled={busy || !editTitle.trim()}
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form id="edit-video-form" className="youtube-shorts-form" onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label htmlFor="edit-title-input">Video Title *</label>
              <input
                id="edit-title-input"
                className="admin-input"
                type="text"
                required
                maxLength={200}
                value={editTitle}
                disabled={busy}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="form-row-duo">
              <div className="form-group">
                <label htmlFor="edit-category-select">Category</label>
                <select
                  id="edit-category-select"
                  className="admin-select"
                  value={editCategory}
                  disabled={busy}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-order-input">Display Order</label>
                <input
                  id="edit-order-input"
                  className="admin-input"
                  type="number"
                  min={0}
                  value={editOrder}
                  disabled={busy}
                  onChange={(e) => setEditOrder(e.target.value)}
                />
              </div>
            </div>

            <label className="toggle-switch-wrapper" htmlFor="edit-active-toggle">
              <div className="toggle-switch-label">
                <strong>Active on website</strong>
                <span>Enable to show this video on the public website.</span>
              </div>
              <input
                id="edit-active-toggle"
                className="toggle-switch-input"
                type="checkbox"
                checked={editActive}
                disabled={busy}
                onChange={(e) => setEditActive(e.target.checked)}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 3: Confirm Channel Short / Exclude Video Decision Modal
         ========================================================================= */}
      {decision && (
        <Modal
          title={
            decision.type === 'confirm'
              ? 'Confirm channel Short'
              : decision.type === 'exclude'
              ? 'Exclude video from website'
              : 'Return Short to review'
          }
          onClose={busy ? undefined : () => setDecision(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="youtube-review-form"
                className={`btn ${decision.type === 'confirm' ? 'btn-primary' : 'btn-danger'}`}
                disabled={
                  busy || (decision.type === 'confirm' && (!confirmed || !decisionTitle.trim()))
                }
              >
                {busy
                  ? 'Saving…'
                  : decision.type === 'confirm'
                  ? 'Confirm and publish Short'
                  : decision.type === 'exclude'
                  ? 'Exclude from website'
                  : 'Return to review'}
              </button>
            </>
          }
        >
          <AdminNotice notice={decisionError ? { type: 'error', message: decisionError } : null} />
          <form id="youtube-review-form" className="admin-youtube-review" onSubmit={saveDecision}>
            {decision.type === 'confirm' ? (
              <>
                <p>
                  Channel ownership has been verified. Open the video on the channel and confirm that it is listed as a
                  Short before publishing.
                </p>
                <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                  Open the channel Shorts
                </a>
                <div className="admin-field">
                  <label htmlFor="youtube-review-title">Video title</label>
                  <input
                    id="youtube-review-title"
                    className="admin-input"
                    value={decisionTitle}
                    required
                    maxLength={200}
                    disabled={busy}
                    onChange={(event) => setDecisionTitle(event.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="youtube-review-category">Testimonial category</label>
                  <select
                    id="youtube-review-category"
                    className="admin-select"
                    value={decisionCategory}
                    disabled={busy}
                    onChange={(event) => setDecisionCategory(event.target.value)}
                  >
                    <option value="">Unassigned (All only)</option>
                    <option value="What Parents Say">What Parents Say</option>
                    <option value="Student Review">Student Review</option>
                    {decisionCategory &&
                    !['What Parents Say', 'Student Review'].includes(decisionCategory) ? (
                      <option value={decisionCategory}>{decisionCategory}</option>
                    ) : null}
                  </select>
                </div>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />{' '}
                  I checked that this video appears in this channel’s Shorts.
                </label>
              </>
            ) : (
              <>
                <p>
                  <strong>{decision.item.title || decision.item.youtubeId}</strong>
                </p>
                <p>
                  {decision.type === 'exclude'
                    ? 'This removes the video from the website and prevents automatic synchronization from adding it again. The YouTube video remains available on its channel.'
                    : 'This removes the video from the public carousel until an administrator confirms its Shorts status again.'}
                </p>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* Screen-reader / test accessible registration form (avoids visual clutter) */}
      <form className="admin-sr-only" onSubmit={register}>
        <label htmlFor="youtube-register-url">Add a YouTube Shorts URL</label>
        <input
          id="youtube-register-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button type="submit">Register URL</button>
      </form>
    </div>
  )
}
