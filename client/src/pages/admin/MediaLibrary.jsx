import { useCallback, useEffect, useState } from 'react'
import {
  deleteMedia,
  fetchMediaStats,
  getMedia,
  listMedia,
  listPages,
  listUnusedMedia,
  renameMedia,
  reoptimizeMedia,
  updateMedia,
  uploadMediaAsset,
} from '../../api/adminApi.js'
import { parseApiError, resolveMediaUrl } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** Centralised image library: upload, optimise, describe and clean up assets. */
export default function MediaLibrary() {
  const [result, setResult] = useState({ items: [], pagination: null })
  const [stats, setStats] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showUnusedOnly, setShowUnusedOnly] = useState(false)
  const [filters, setFilters] = useState({ search: '', folder: '', page: 1 })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [media, mediaStats] = await Promise.all([listMedia(filters), fetchMediaStats()])
      setResult({ items: media.data, pagination: media.pagination })
      setStats(mediaStats)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listPages()
      .then(setPages)
      .catch(() => setPages([]))
  }, [])

  const openUnused = async () => {
    if (showUnusedOnly) {
      setShowUnusedOnly(false)
      return
    }
    try {
      const unused = await listUnusedMedia()
      setResult({ items: unused, pagination: null })
      setShowUnusedOnly(true)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setNotice(null)
    try {
      const asset = await uploadMediaAsset(file, { folder: filters.folder || 'general' })
      setNotice({ type: 'success', message: `Uploaded "${asset.filename}" with ${asset.variants?.length ?? 0} optimised rendition(s).` })
      setShowUnusedOnly(false)
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setUploading(false)
    }
  }

  const openEditor = async (asset) => {
    setNotice(null)
    try {
      setEditing(await getMedia(asset.id))
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        altText: editing.altText || null,
        title: editing.title || null,
        caption: editing.caption || null,
        description: editing.description || null,
        folder: editing.folder || null,
        pageId: editing.pageId ? Number(editing.pageId) : null,
      }
      await updateMedia(editing.id, payload)
      setEditing(null)
      setNotice({ type: 'success', message: 'Image details saved.' })
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async () => {
    setSaving(true)
    try {
      const renamed = await renameMedia(editing.id, editing.filename)
      setEditing(await getMedia(renamed.id))
      setNotice({ type: 'success', message: 'Image renamed and renditions regenerated.' })
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(false)
    }
  }

  const handleReoptimize = async () => {
    setSaving(true)
    try {
      await reoptimizeMedia(editing.id)
      setEditing(await getMedia(editing.id))
      setNotice({ type: 'success', message: 'Optimised renditions regenerated.' })
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${editing.filename}" and every rendition it produced?`)) return
    try {
      await deleteMedia(editing.id)
      setEditing(null)
      setNotice({ type: 'success', message: 'Image deleted.' })
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>
              <i className="fas fa-images" aria-hidden="true" /> Image library
            </h2>
            <p className="row-sub">
              Originals are preserved and WebP/AVIF renditions are generated on upload, so the original can always be
              restored.
            </p>
          </div>
          <label className="btn btn-primary btn-sm">
            <i className="fas fa-cloud-arrow-up" aria-hidden="true" /> {uploading ? 'Uploading…' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
          </label>
        </div>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        <div className="admin-toolbar">
          <input
            type="search"
            aria-label="Search images"
            placeholder="Search by filename, alt text or title…"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
          />
          <input
            type="text"
            aria-label="Filter by folder"
            placeholder="Folder"
            value={filters.folder}
            onChange={(event) => setFilters((current) => ({ ...current, folder: event.target.value, page: 1 }))}
          />
          <button type="button" className={`btn btn-sm ${showUnusedOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={openUnused}>
            <i className="fas fa-eye-slash" aria-hidden="true" /> {showUnusedOnly ? 'Show all images' : 'Show unused only'}
          </button>
        </div>
      </div>

      {stats ? (
        <div className="stat-cards">
          <div className="stat-card">
            <div className="label">Images</div>
            <div className="value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="label">Missing alt text</div>
            <div className="value">{stats.missingAlt}</div>
          </div>
          <div className="stat-card">
            <div className="label">Oversized</div>
            <div className="value">{stats.oversized}</div>
          </div>
          <div className="stat-card">
            <div className="label">Optimised</div>
            <div className="value">{stats.optimized}</div>
          </div>
          <div className="stat-card">
            <div className="label">Unused</div>
            <div className="value">{stats.unused}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total size</div>
            <div className="value" style={{ fontSize: '1.3rem' }}>
              {formatBytes(stats.totalBytes)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-card">
        {loading ? (
          <StateBlock variant="loading" title="Loading images…" />
        ) : error ? (
          <StateBlock variant="error" title="Could not load the image library" message={error.message} onRetry={load} />
        ) : result.items.length === 0 ? (
          <StateBlock
            variant="empty"
            title={showUnusedOnly ? 'Every image is in use' : 'No images yet'}
            message={showUnusedOnly ? 'No unused assets were found.' : 'Upload an image to get started.'}
          />
        ) : (
          <>
            <div className="admin-grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {result.items.map((asset) => (
                <div key={asset.id} className="admin-card" style={{ marginBottom: 0, padding: 14 }}>
                  <img
                    src={resolveMediaUrl(asset.url)}
                    alt={asset.altText || ''}
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                  <p className="row-title" style={{ marginTop: 10, wordBreak: 'break-all' }}>
                    {asset.filename}
                  </p>
                  <p className="row-sub">
                    {asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Dimensions unknown'} · {formatBytes(asset.sizeBytes)}
                  </p>
                  <p className="row-sub">
                    {asset.isOptimized ? <span className="badge badge-active">optimised</span> : <span className="badge badge-disabled">original only</span>}
                    {!(asset.altText || '').trim() ? <span className="badge badge-contacted" style={{ marginLeft: 6 }}>no alt text</span> : null}
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => openEditor(asset)}>
                    <i className="fas fa-pen" aria-hidden="true" /> Manage image
                  </button>
                </div>
              ))}
            </div>

            {result.pagination && result.pagination.totalPages > 1 ? (
              <div className="pagination">
                <button
                  type="button"
                  disabled={result.pagination.page <= 1}
                  onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
                >
                  Previous
                </button>
                <span>
                  Page {result.pagination.page} of {result.pagination.totalPages} ({result.pagination.total} images)
                </span>
                <button
                  type="button"
                  disabled={result.pagination.page >= result.pagination.totalPages}
                  onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {editing ? (
        <Modal
          title={`Manage "${editing.filename}"`}
          onClose={() => setEditing(null)}
          size="lg"
          footer={
            <>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete image
              </button>
              <button type="submit" form="media-form" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save details'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <img
              src={resolveMediaUrl(editing.url)}
              alt={editing.altText || ''}
              style={{ width: 220, height: 150, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p className="row-sub">
                {editing.width && editing.height ? `${editing.width}×${editing.height}` : 'Dimensions unknown'} ·{' '}
                {formatBytes(editing.sizeBytes)} · {editing.mimeType}
              </p>
              <p className="row-sub">
                {editing.variants?.length
                  ? `Renditions: ${editing.variants.map((variant) => `${variant.format} ${variant.width}px`).join(', ')}`
                  : 'No optimised renditions were generated for this file.'}
              </p>
              <p className="row-sub">
                {editing.usages?.length ? `Used in ${editing.usages.length} place(s)` : 'Not referenced anywhere yet'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleReoptimize} disabled={saving}>
                  <i className="fas fa-wand-magic-sparkles" aria-hidden="true" /> Re-run optimisation
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleRename} disabled={saving}>
                  <i className="fas fa-i-cursor" aria-hidden="true" /> Rename file
                </button>
              </div>
            </div>
          </div>

          {editing.usages?.length ? (
            <div className="admin-field">
              <label>Where this image is used</label>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {editing.usages.map((usage, index) => (
                  <li key={`${usage.type}-${usage.id}-${index}`}>{usage.label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <form id="media-form" onSubmit={handleSave}>
            <div className="admin-field">
              <label htmlFor="media-filename">Filename</label>
              <input
                id="media-filename"
                className="admin-input"
                value={editing.filename}
                onChange={(event) => setEditing((current) => ({ ...current, filename: event.target.value }))}
              />
              <p className="hint">
                A descriptive filename helps image search. Renaming moves the file and regenerates its renditions.
              </p>
            </div>

            <div className="admin-field">
              <label htmlFor="media-alt">Alt text</label>
              <input
                id="media-alt"
                className="admin-input"
                value={editing.altText || ''}
                onChange={(event) => setEditing((current) => ({ ...current, altText: event.target.value }))}
              />
              <p className="hint">Describe what the image shows for visitors who cannot see it.</p>
            </div>

            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="media-title">Title</label>
                <input
                  id="media-title"
                  className="admin-input"
                  value={editing.title || ''}
                  onChange={(event) => setEditing((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="media-folder">Folder</label>
                <input
                  id="media-folder"
                  className="admin-input"
                  value={editing.folder || ''}
                  onChange={(event) => setEditing((current) => ({ ...current, folder: event.target.value }))}
                />
              </div>
            </div>

            <div className="admin-field">
              <label htmlFor="media-caption">Caption</label>
              <input
                id="media-caption"
                className="admin-input"
                value={editing.caption || ''}
                onChange={(event) => setEditing((current) => ({ ...current, caption: event.target.value }))}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="media-description">Description</label>
              <textarea
                id="media-description"
                className="admin-textarea"
                rows={3}
                value={editing.description || ''}
                onChange={(event) => setEditing((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="media-page">Assign to page</label>
              <select
                id="media-page"
                className="admin-select"
                value={editing.pageId || ''}
                onChange={(event) => setEditing((current) => ({ ...current, pageId: event.target.value }))}
              >
                <option value="">Not assigned</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name} ({page.route})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
