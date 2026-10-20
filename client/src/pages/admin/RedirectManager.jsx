import { useCallback, useEffect, useState } from 'react'
import { createRedirect, deleteRedirect, listRedirects, updateRedirect } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const STATUS_CODES = [301, 302, 307, 308]

const emptyForm = () => ({ sourcePath: '', destinationPath: '', statusCode: 301, isActive: true, note: '' })

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/**
 * Redirect manager. Rules are enforced by the Express server, so a visitor or
 * crawler hitting an old URL receives a real HTTP redirect.
 */
export default function RedirectManager() {
  const [rows, setRows] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listRedirects({ search: search || undefined, activeOnly })
      setRows(result.data)
      setIssues(result.meta?.issues || [])
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [search, activeOnly])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const payload = {
        sourcePath: editing.sourcePath.trim(),
        destinationPath: editing.destinationPath.trim(),
        statusCode: Number(editing.statusCode),
        isActive: Boolean(editing.isActive),
        note: editing.note?.trim() || null,
      }
      if (editing.id) {
        await updateRedirect(editing.id, payload)
        setNotice({ type: 'success', message: 'Redirect updated.' })
      } else {
        await createRedirect(payload)
        setNotice({ type: 'success', message: 'Redirect created.' })
      }
      setEditing(null)
      await load()
    } catch (err) {
      const parsed = parseApiError(err)
      const detail = parsed.details ? Object.values(parsed.details)[0] : null
      setNotice({ type: 'error', message: detail || parsed.message })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (row) => {
    try {
      await updateRedirect(row.id, { isActive: !row.isActive })
      await load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the redirect for "${row.sourcePath}"?`)) return
    try {
      await deleteRedirect(row.id)
      setNotice({ type: 'success', message: 'Redirect deleted.' })
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
              <i className="fas fa-signs-post" aria-hidden="true" /> Redirect manager
            </h2>
            <p className="row-sub">
              Send retired URLs to their new location with a real server-side HTTP redirect. Loops and external
              destinations are rejected.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(emptyForm())}>
            <i className="fas fa-plus" aria-hidden="true" /> Add redirect
          </button>
        </div>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        <div className="admin-toolbar">
          <input
            type="search"
            aria-label="Search redirects"
            placeholder="Search paths…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="admin-checkbox" htmlFor="redirects-active-only">
            <input
              id="redirects-active-only"
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Active only
          </label>
        </div>

        {issues.length > 0 ? (
          <p className="form-notice plain error" role="alert">
            <span>
              {issues.length} redirect issue(s) detected:{' '}
              {issues.map((issue) => issue.message).join(' ')}
            </span>
          </p>
        ) : null}

        {loading ? (
          <StateBlock variant="loading" title="Loading redirects…" />
        ) : error ? (
          <StateBlock variant="error" title="Could not load redirects" message={error.message} onRetry={load} />
        ) : rows.length === 0 ? (
          <StateBlock variant="empty" title="No redirects yet" message="Add a redirect when a page path changes." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Hits</th>
                  <th>Last hit</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.sourcePath}</code>
                    </td>
                    <td>
                      <code>{row.destinationPath}</code>
                    </td>
                    <td>{row.statusCode}</td>
                    <td>
                      <span className={`badge badge-${row.isActive ? 'active' : 'disabled'}`}>{row.isActive ? 'active' : 'inactive'}</span>
                    </td>
                    <td>{row.hits ?? 0}</td>
                    <td>{formatDate(row.lastHitAt)}</td>
                    <td>{row.note || '—'}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...emptyForm(), ...row })}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleToggle(row)}>
                        {row.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing ? (
        <Modal
          title={editing.id ? 'Edit redirect' : 'Add redirect'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="redirect-form" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save redirect'}
              </button>
            </>
          }
        >
          <form id="redirect-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="redirect-source">Source path *</label>
              <input
                id="redirect-source"
                className="admin-input"
                value={editing.sourcePath}
                placeholder="/old-page"
                onChange={(event) => setEditing((current) => ({ ...current, sourcePath: event.target.value }))}
                required
              />
              <p className="hint">The retired path a visitor requests. Must begin with &quot;/&quot;.</p>
            </div>

            <div className="admin-field">
              <label htmlFor="redirect-destination">Destination *</label>
              <input
                id="redirect-destination"
                className="admin-input"
                value={editing.destinationPath}
                placeholder="/services or https://g3beducation.com/services"
                onChange={(event) => setEditing((current) => ({ ...current, destinationPath: event.target.value }))}
                required
              />
              <p className="hint">Redirects may only point at this website. External destinations are refused.</p>
            </div>

            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="redirect-code">Status code</label>
                <select
                  id="redirect-code"
                  className="admin-select"
                  value={editing.statusCode}
                  onChange={(event) => setEditing((current) => ({ ...current, statusCode: event.target.value }))}
                >
                  {STATUS_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code} {code === 301 ? '(permanent)' : code === 302 ? '(temporary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="redirect-note">Note</label>
                <input
                  id="redirect-note"
                  className="admin-input"
                  value={editing.note || ''}
                  onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))}
                />
              </div>
            </div>

            <label className="admin-checkbox" htmlFor="redirect-active">
              <input
                id="redirect-active"
                type="checkbox"
                checked={Boolean(editing.isActive)}
                onChange={(event) => setEditing((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
