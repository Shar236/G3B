import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createResource,
  deleteResource,
  listResource,
  reorderResource,
  updateResource,
  uploadImage,
} from '../../api/adminApi.js'
import { parseApiError, resolveMediaUrl } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { AdminNotice, AdminPagination, ConfirmAction, TableSkeleton } from './AdminDataUI.jsx'
import { downloadContentCsv, isSafeAssetUrl, parseVideoUrl, validateContentForm } from './contentTools.js'

// Resources backed by the generic reorder endpoint (services/destinations use
// dedicated repositories and order themselves by their own sort order field).
const REORDERABLE = new Set([
  'services',
  'destinations',
  'navigation',
  'gallery',
  'testimonials',
  'videos',
  'process-steps',
  'stats',
  'why-features',
  'certifications',
  'enquiry-options',
  'social-links',
])

/** Group fields into rows so short fields sit side by side. */
function buildRows(fields) {
  const rows = []
  let buffer = []
  const flush = () => {
    if (buffer.length > 0) {
      rows.push(buffer)
      buffer = []
    }
  }
  for (const field of fields) {
    if (field.col === 'full') {
      flush()
      rows.push([field])
    } else {
      buffer.push(field)
      if (buffer.length === 2) flush()
    }
  }
  flush()
  return rows
}

/** Build an empty form state from the field definitions. */
const emptyForm = (fields) =>
  Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === 'checkbox' ? true : field.type === 'number' ? field.min ?? 0 : field.type === 'select' ? field.options[0]?.value || '' : '',
    ]),
  )

/** Convert a stored record into editable form values. */
const toForm = (fields, record) =>
  Object.fromEntries(
    fields.map((field) => {
      const value = record?.[field.name]
      if (field.type === 'list') return [field.name, Array.isArray(value) ? value.join('\n') : '']
      if (field.type === 'json') {
        if (value === null || value === undefined) return [field.name, '']
        return [field.name, typeof value === 'string' ? value : JSON.stringify(value, null, 2)]
      }
      if (field.type === 'checkbox') return [field.name, value === undefined ? true : Boolean(value)]
      if (field.type === 'number') return [field.name, value ?? 0]
      return [field.name, value ?? '']
    }),
  )

/** Convert form values into the API payload. */
function toPayload(fields, form) {
  const payload = {}
  for (const field of fields) {
    const value = form[field.name]
    if (field.type === 'list') {
      payload[field.name] = String(value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    } else if (field.type === 'json') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        payload[field.name] = null
      } else {
        try {
          payload[field.name] = JSON.parse(value.trim())
        } catch {
          payload[field.name] = value.trim()
        }
      }
    } else if (field.type === 'number') {
      payload[field.name] = value === '' || value === null ? 0 : Number(value)
    } else if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value)
    } else {
      payload[field.name] = typeof value === 'string' ? value.trim() : value
    }
  }
  return payload
}

/** Generic list/create/edit/delete screen driven by a resource config. */
export default function ContentResource({ resource, config, allowCreate = true }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => emptyForm(config.fields))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [formError, setFormError] = useState(null)
  const loadGeneration = useRef(0)
  const pendingMutation = useRef(false)

  const rows = useMemo(() => buildRows(config.fields), [config.fields])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const result = items.filter((record) => (!term || Object.values(record).some((value) => String(value || '').toLowerCase().includes(term))) && (!visibility || Boolean(record.isActive) === (visibility === 'active')))
    if (sortBy) result.sort((left, right) => String(left[sortBy] ?? '').localeCompare(String(right[sortBy] ?? ''), undefined, { numeric: true }))
    return result
  }, [items, search, visibility, sortBy])
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, totalPages)
  const visibleItems = filtered.slice((currentPage - 1) * 20, currentPage * 20)
  const selectedItems = visibleItems.filter((item) => selected.includes(item.id))
  const canReorder = REORDERABLE.has(resource) && !search && !visibility && !sortBy
  const video = resource === 'videos' ? parseVideoUrl(form.youtubeUrl) : null

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current
    setLoading(true)
    setError(null)
    try {
      const records = await listResource(resource)
      if (generation === loadGeneration.current) setItems(records)
    } catch (err) {
      if (generation === loadGeneration.current) setError(parseApiError(err))
    } finally {
      if (generation === loadGeneration.current) setLoading(false)
    }
  }, [resource])

  useEffect(() => {
    setSelected([])
    setEditing(null)
    setSearch('')
    setVisibility('')
    setSortBy('')
    setPage(1)
    load()
    return () => { loadGeneration.current += 1 }
  }, [load])

  const openCreate = () => {
    setEditing({ id: null })
    setForm(emptyForm(config.fields))
    setNotice(null)
    setFormError(null)
  }

  const openEdit = (record) => {
    setEditing(record)
    setForm(toForm(config.fields, record))
    setNotice(null)
    setFormError(null)
  }

  const closeModal = () => setEditing(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pendingMutation.current) return
    pendingMutation.current = true
    setSaving(true)
    setFormError(null)
    const previous = items
    try {
      validateContentForm(config.fields, form, resource)
      const payload = toPayload(config.fields, form)
      if (resource === 'videos') payload.youtubeId = parseVideoUrl(payload.youtubeUrl).id
      if (editing?.id) {
        setItems((current) => current.map((item) => item.id === editing.id ? { ...item, ...payload } : item))
        await updateResource(resource, editing.id, payload)
        setNotice({ type: 'success', message: `${config.singular} updated.` })
      } else {
        await createResource(resource, payload)
        setNotice({ type: 'success', message: `${config.singular} created.` })
      }
      closeModal()
      load()
    } catch (err) {
      const parsed = parseApiError(err)
      setItems(previous)
      setFormError(parsed.message)
    } finally {
      pendingMutation.current = false
      setSaving(false)
    }
  }

  const handleBulk = async (records, action) => {
    if (pendingMutation.current || busy || !records.length) return
    pendingMutation.current = true
    setBusy(true)
    const previous = items
    const ids = records.map((record) => record.id)
    setItems((current) => action === 'delete' ? current.filter((item) => !ids.includes(item.id)) : current.map((item) => ids.includes(item.id) ? { ...item, isActive: action === 'show' } : item))
    const results = await Promise.allSettled(records.map((record) => action === 'delete' ? deleteResource(resource, record.id) : updateResource(resource, record.id, { isActive: action === 'show' })))
    const failed = results.filter((result) => result.status === 'rejected')
    const completedIds = ids.filter((_, index) => results[index].status === 'fulfilled')
    setItems(action === 'delete' ? previous.filter((item) => !completedIds.includes(item.id)) : previous.map((item) => completedIds.includes(item.id) ? { ...item, isActive: action === 'show' } : item))
    setNotice(failed.length ? { type: 'error', message: `${records.length - failed.length} updated; ${failed.length} failed. ${parseApiError(failed[0].reason).message}` } : { type: 'success', message: `${records.length} ${records.length === 1 ? config.singular.toLowerCase() : 'items'} ${action === 'delete' ? 'deleted' : action === 'show' ? 'shown' : 'hidden'}.` })
    setBusy(false)
    pendingMutation.current = false
    setConfirmation(null)
    setSelected([])
    load()
  }

  const move = async (index, direction) => {
    if (pendingMutation.current || busy) return
    const target = index + direction
    if (target < 0 || target >= items.length) return
    pendingMutation.current = true
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setItems(next)
    setBusy(true)
    try {
      await reorderResource(resource, next.map((item) => item.id))
      setNotice({ type: 'success', message: 'Display order updated.' })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
      setItems(items)
    } finally { pendingMutation.current = false; setBusy(false) }
  }

  const handleUpload = async (field, file) => {
    if (!file || pendingMutation.current) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFormError('Choose a PNG, JPG, WEBP, AVIF or SVG image smaller than 5 MB.')
      return
    }
    pendingMutation.current = true
    setUploading(field)
    try {
      const result = await uploadImage(file)
      setForm((current) => ({ ...current, [field]: result.relativeUrl || result.url }))
    } catch (err) {
      setFormError(parseApiError(err).message)
    } finally {
      pendingMutation.current = false
      setUploading(null)
    }
  }

  const renderField = (field) => {
    const value = form[field.name]
    const id = `${resource}-${field.name}`
    const inputProps = { required: Boolean(field.required), disabled: saving || Boolean(uploading), maxLength: field.maxLength || (field.type === 'textarea' ? 3000 : field.type === 'json' ? 20000 : field.type === 'list' ? 6000 : 500) }

    if (field.type === 'checkbox') {
      return (
        <label className="admin-checkbox" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            disabled={saving || Boolean(uploading)}
            checked={Boolean(value)}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.checked }))}
          />
          {field.label}
        </label>
      )
    }

    return (
      <div className="admin-field">
        <label htmlFor={id}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>

        {field.type === 'json' ? (
          <>
            <textarea
              id={id}
              {...inputProps}
              className="admin-textarea"
              rows={6}
              value={value}
              placeholder={field.placeholder}
              onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
              style={{ fontFamily: 'Consolas, monospace', fontSize: '13px', whiteSpace: 'pre' }}
            />
          </>
        ) : field.type === 'textarea' || field.type === 'list' ? (
          <textarea
            id={id}
            className="admin-textarea"
              {...inputProps}
            rows={field.type === 'list' ? 5 : 4}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
          />
        ) : field.type === 'select' ? (
          <select
            id={id}
            required={Boolean(field.required)}
            disabled={saving || Boolean(uploading)}
            className="admin-select"
            value={value}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
          >
            <option value="">Select…</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'number' ? (
          <input
            id={id}
            className="admin-input"
            type="number"
            required={Boolean(field.required)}
            disabled={saving || Boolean(uploading)}
            min={field.min}
            max={field.max}
            value={value}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
          />
        ) : field.type === 'image' ? (
          <div className="admin-image-field-wrap">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                id={id}
                {...inputProps}
                className="admin-input"
                type="text"
                value={value}
                placeholder="https://… or upload below"
                onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                style={{ flex: 1 }}
              />
              {value ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setForm((current) => ({ ...current, [field.name]: '' }))}
                  title="Clear image"
                  aria-label={`Clear ${field.label}`}
                  disabled={saving || Boolean(uploading)}
                >
                  <i className="fas fa-trash-can" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div
              className="admin-dropzone"
              role="button"
              tabIndex={saving || uploading ? -1 : 0}
              aria-label={`Upload ${field.label}`}
              onKeyDown={(event) => { if (['Enter', ' '].includes(event.key) && !saving && !uploading) { event.preventDefault(); document.getElementById(`${id}-file-input`)?.click() } }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!saving && !uploading && e.dataTransfer.files?.[0]) handleUpload(field.name, e.dataTransfer.files[0]);
              }}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => { if (!saving && !uploading) document.getElementById(`${id}-file-input`)?.click() }}
            >
              <input
                id={`${id}-file-input`}
                type="file"
                accept="image/*"
                aria-label={`Upload ${field.label}`}
                style={{ display: 'none' }}
                onChange={(event) => handleUpload(field.name, event.target.files?.[0])}
              />
              <i className="fas fa-cloud-arrow-up" style={{ fontSize: '20px', color: '#0B2C5F', marginBottom: '4px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                {uploading === field.name ? 'Uploading image…' : 'Click to upload or drag & drop image'}
              </p>
              <span className="hint" style={{ fontSize: '11px' }}>PNG, JPG, WEBP, AVIF or SVG (max 5MB)</span>
            </div>
            {value && isSafeAssetUrl(value) ? (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={resolveMediaUrl(value)} alt="" className="thumb" style={{ width: 120, height: 75, objectFit: 'cover', borderRadius: '6px' }} />
                <span className="hint" style={{ wordBreak: 'break-all' }}>{value}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <input
            id={id}
            className="admin-input"
            type="text"
            {...inputProps}
            value={value}
            placeholder={field.placeholder}
            readOnly={resource === 'videos' && field.name === 'youtubeId'}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value, ...(resource === 'videos' && field.name === 'youtubeUrl' ? { youtubeId: parseVideoUrl(event.target.value)?.id || '' } : {}) }))}
          />
        )}

        {field.hint ? <p className="hint">{field.hint}</p> : null}
        {resource === 'videos' && field.name === 'youtubeUrl' && value ? video ? <iframe className="admin-video-preview" src={video.embedUrl} title={`Preview: ${form.title || 'video testimonial'}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowFullScreen /> : <p className="hint" role="status">Enter a supported YouTube or Vimeo URL to see the preview.</p> : null}
      </div>
    )
  }

  const renderCell = (column, record) => {
    if (column.image) {
      return record[column.name] ? (
        <img className="thumb" src={resolveMediaUrl(record[column.name])} alt="" />
      ) : (
        '—'
      )
    }
    if (column.render) return column.render(record)
    const value = record[column.name]
    return value === null || value === undefined || value === '' ? '—' : String(value)
  }

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>
            <i className={config.icon} aria-hidden="true" /> {config.label}
          </h2>
          <p className="row-sub">{config.description}</p>
        </div>
        <div className="admin-action-group"><button type="button" className="btn btn-secondary btn-sm" disabled={loading || !filtered.length} onClick={() => downloadContentCsv(`g3b-${resource}.csv`, filtered, [{ name: 'id', label: 'ID' }, ...config.listColumns])}>Export filtered CSV</button>{allowCreate ? <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="fas fa-plus" aria-hidden="true" /> Add {config.singular.toLowerCase()}
        </button> : null}</div>
      </div>

      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
        </p>
      ) : null}

      <div className="admin-toolbar">
        <input type="search" aria-label={`Search ${config.label.toLowerCase()}`} placeholder="Search content" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelected([]) }} />
        <select aria-label="Filter content visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value); setPage(1); setSelected([]) }}><option value="">All visibility</option><option value="active">Visible</option><option value="hidden">Hidden</option></select>
        <select aria-label="Sort content" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); setSelected([]) }}><option value="">Display order</option>{config.listColumns.filter((column) => !column.image).map((column) => <option key={column.name} value={column.name}>{column.label} (ascending)</option>)}</select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setVisibility(''); setSortBy(''); setPage(1); setSelected([]) }}>Reset filters</button>
      </div>
      {selectedItems.length ? <div className="admin-bulk-bar"><strong>{selectedItems.length} selected</strong><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => handleBulk(selectedItems, 'show')}>Show selected</button><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => handleBulk(selectedItems, 'hide')}>Hide selected</button><button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ records: selectedItems, message: `Delete ${selectedItems.length} selected content items?` })}>Delete selected</button></div> : null}

      {loading ? (
        <TableSkeleton columns={config.listColumns.length} />
      ) : error ? (
        <StateBlock variant="error" title={`Could not load ${config.label.toLowerCase()}`} message={error.message} onRetry={load} />
      ) : filtered.length === 0 ? (
        <StateBlock variant="empty" title={`No ${config.label.toLowerCase()} yet`} message={allowCreate ? `Add your first ${config.singular.toLowerCase()} to get started.` : 'Register and confirm a channel Short above to add it to the website.'}>
          {allowCreate ? <button type="button" className="btn btn-secondary btn-sm" onClick={openCreate}>
            <i className="fas fa-plus" aria-hidden="true" /> Add {config.singular.toLowerCase()}
          </button> : null}
        </StateBlock>
      ) : (
        <><div className="table-wrap admin-data-table" tabIndex={0} role="region" aria-label={`${config.label} table; scroll horizontally for all columns`}>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-check-cell"><input type="checkbox" aria-label="Select all content on this page" checked={visibleItems.length > 0 && selectedItems.length === visibleItems.length} disabled={busy} onChange={(event) => setSelected(event.target.checked ? visibleItems.map((item) => item.id) : [])} /></th>
                {config.listColumns.map((column) => (
                  <th key={column.name}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((record) => (
                <tr key={record.id}>
                  <td className="admin-check-cell"><input type="checkbox" checked={selected.includes(record.id)} disabled={busy} aria-label={`Select item ${record.id}`} onChange={() => setSelected((current) => current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id])} /></td>
                  {config.listColumns.map((column) => (
                    <td key={column.name}>{renderCell(column, record)}</td>
                  ))}
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => openEdit(record)}>
                      Edit
                    </button>
                    {canReorder ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy || items.findIndex((item) => item.id === record.id) === 0}
                          aria-label="Move up"
                          onClick={() => move(items.findIndex((item) => item.id === record.id), -1)}
                        >
                          <i className="fas fa-arrow-up" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy || items.findIndex((item) => item.id === record.id) === items.length - 1}
                          aria-label="Move down"
                          onClick={() => move(items.findIndex((item) => item.id === record.id), 1)}
                        >
                          <i className="fas fa-arrow-down" aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ records: [record], message: `Delete this ${config.singular.toLowerCase()}?` })}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div><AdminPagination pagination={{ page: currentPage, totalPages, total: filtered.length }} disabled={busy} onPage={(value) => { setPage(value); setSelected([]) }} /></>
      )}

      {editing ? (
        <Modal
          title={`${editing.id ? 'Edit' : 'Add'} ${config.singular.toLowerCase()}`}
          onClose={saving || uploading ? undefined : closeModal}
          size="lg"
          footer={
            <>
              <button type="button" className="btn btn-ghost" disabled={saving || Boolean(uploading)} onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" form={`${resource}-form`} className="btn btn-primary" disabled={saving || Boolean(uploading)}>
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-floppy-disk" aria-hidden="true" /> Save
                  </>
                )}
              </button>
            </>
          }
        >
          <AdminNotice notice={formError ? { type: 'error', message: formError } : null} />
          <form id={`${resource}-form`} onSubmit={handleSubmit}>
            {rows.map((row, index) =>
              row.length === 1 ? (
                <div key={index}>{renderField(row[0])}</div>
              ) : (
                <div className="admin-grid-2" key={index}>
                  {row.map((field) => (
                    <div key={field.name}>{renderField(field)}</div>
                  ))}
                </div>
              ),
            )}
          </form>
        </Modal>
      ) : null}
      <ConfirmAction action={confirmation} busy={busy} onClose={() => setConfirmation(null)} onConfirm={() => handleBulk(confirmation.records, 'delete')} />
    </div>
  )
}
