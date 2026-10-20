import { useCallback, useEffect, useMemo, useState } from 'react'
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
      field.type === 'checkbox' ? true : field.type === 'list' || field.type === 'json' ? '' : field.type === 'number' ? 0 : '',
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
export default function ContentResource({ resource, config }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => emptyForm(config.fields))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)

  const rows = useMemo(() => buildRows(config.fields), [config.fields])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listResource(resource))
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [resource])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing({ id: null })
    setForm(emptyForm(config.fields))
    setNotice(null)
  }

  const openEdit = (record) => {
    setEditing(record)
    setForm(toForm(config.fields, record))
    setNotice(null)
  }

  const closeModal = () => setEditing(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = toPayload(config.fields, form)
      if (editing?.id) {
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
      setNotice({ type: 'error', message: parsed.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const label = record.title || record.country || record.authorName || record.altText || record.label || record.platform || 'this item'
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    try {
      await deleteResource(resource, record.id)
      setNotice({ type: 'success', message: `${config.singular} deleted.` })
      load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const move = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setItems(next)
    try {
      await reorderResource(resource, next.map((item) => item.id))
      setNotice({ type: 'success', message: 'Display order updated.' })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
      load()
    }
  }

  const handleUpload = async (field, file) => {
    if (!file) return
    setUploading(field)
    try {
      const result = await uploadImage(file)
      setForm((current) => ({ ...current, [field]: result.relativeUrl || result.url }))
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setUploading(null)
    }
  }

  const renderField = (field) => {
    const value = form[field.name]
    const id = `${resource}-${field.name}`

    if (field.type === 'checkbox') {
      return (
        <label className="admin-checkbox" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
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
            rows={field.type === 'list' ? 5 : 4}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
          />
        ) : field.type === 'select' ? (
          <select
            id={id}
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
                >
                  <i className="fas fa-trash-can" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div
              className="admin-dropzone"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.[0]) handleUpload(field.name, e.dataTransfer.files[0]);
              }}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById(`${id}-file-input`)?.click()}
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
            {value ? (
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
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
          />
        )}

        {field.hint ? <p className="hint">{field.hint}</p> : null}
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
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="fas fa-plus" aria-hidden="true" /> Add {config.singular.toLowerCase()}
        </button>
      </div>

      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
        </p>
      ) : null}

      {loading ? (
        <StateBlock variant="loading" title={`Loading ${config.label.toLowerCase()}…`} />
      ) : error ? (
        <StateBlock variant="error" title={`Could not load ${config.label.toLowerCase()}`} message={error.message} onRetry={load} />
      ) : items.length === 0 ? (
        <StateBlock variant="empty" title={`No ${config.label.toLowerCase()} yet`} message={`Add your first ${config.singular.toLowerCase()} to get started.`}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openCreate}>
            <i className="fas fa-plus" aria-hidden="true" /> Add {config.singular.toLowerCase()}
          </button>
        </StateBlock>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {config.listColumns.map((column) => (
                  <th key={column.name}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((record, index) => (
                <tr key={record.id}>
                  {config.listColumns.map((column) => (
                    <td key={column.name}>{renderCell(column, record)}</td>
                  ))}
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(record)}>
                      Edit
                    </button>
                    {REORDERABLE.has(resource) ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={index === 0}
                          aria-label="Move up"
                          onClick={() => move(index, -1)}
                        >
                          <i className="fas fa-arrow-up" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={index === items.length - 1}
                          aria-label="Move down"
                          onClick={() => move(index, 1)}
                        >
                          <i className="fas fa-arrow-down" aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(record)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <Modal
          title={`${editing.id ? 'Edit' : 'Add'} ${config.singular.toLowerCase()}`}
          onClose={closeModal}
          size="lg"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" form={`${resource}-form`} className="btn btn-primary" disabled={saving}>
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
    </div>
  )
}
