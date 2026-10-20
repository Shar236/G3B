import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteEnquiry, fetchEnquiryStats, getEnquiry, updateEnquiry } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'

const STATUSES = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed']

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/** Single enquiry: full detail, status updates, assignment and deletion. */
export default function EnquiryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [enquiry, setEnquiry] = useState(null)
  const [assignees, setAssignees] = useState([])
  const [form, setForm] = useState({ status: 'new', assignedTo: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [record, stats] = await Promise.all([getEnquiry(id), fetchEnquiryStats()])
      setEnquiry(record)
      setForm({ status: record.status, assignedTo: record.assignedTo || '' })
      setAssignees(stats.assignees || [])
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const updated = await updateEnquiry(id, {
        status: form.status,
        assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      })
      setEnquiry(updated)
      setNotice({ type: 'success', message: 'Enquiry updated.' })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this enquiry? This cannot be undone.')) return
    try {
      await deleteEnquiry(id)
      navigate(adminPath('enquiries'), { replace: true })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  if (loading) return <StateBlock variant="loading" title="Loading enquiry…" />
  if (error) return <StateBlock variant="error" title="Could not load this enquiry" message={error.message} onRetry={load} />
  if (!enquiry) return <StateBlock variant="empty" title="Enquiry not found" />

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-head">
          <h2>
            <i className="fas fa-envelope-open-text" aria-hidden="true" /> {enquiry.fullName}
          </h2>
          <Link className="btn btn-ghost btn-sm" to={adminPath('enquiries')}>
            <i className="fas fa-arrow-left" aria-hidden="true" /> Back to list
          </Link>
        </div>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        <div className="admin-grid-2">
          <div>
            <p className="row-sub">Email</p>
            <p>
              <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
            </p>
            <p className="row-sub" style={{ marginTop: 12 }}>
              Phone
            </p>
            <p>
              <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>
            </p>
            <p className="row-sub" style={{ marginTop: 12 }}>
              Interested in
            </p>
            <p>{enquiry.serviceInterest}</p>
            <p className="row-sub" style={{ marginTop: 12 }}>
              Preferred destination
            </p>
            <p>{enquiry.preferredDestination || '—'}</p>
          </div>
          <div>
            <p className="row-sub">Received</p>
            <p>{formatDate(enquiry.createdAt)}</p>
            <p className="row-sub" style={{ marginTop: 12 }}>
              Last updated
            </p>
            <p>{formatDate(enquiry.updatedAt)}</p>
            <p className="row-sub" style={{ marginTop: 12 }}>
              Source
            </p>
            <p>{enquiry.source || 'website'}</p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <p className="row-sub">Message</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{enquiry.message || '—'}</p>
        </div>
      </div>

      <div className="admin-card">
        <h3>
          <i className="fas fa-list-check" aria-hidden="true" /> Status &amp; assignment
        </h3>
        <form onSubmit={handleSave}>
          <div className="admin-grid-2">
            <div className="admin-field">
              <label htmlFor="enquiry-status">Status</label>
              <select
                id="enquiry-status"
                className="admin-select"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label htmlFor="enquiry-assignee">Assigned staff</label>
              <select
                id="enquiry-assignee"
                className="admin-select"
                value={form.assignedTo}
                onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} ({assignee.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions left" style={{ marginTop: 0 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk" aria-hidden="true" /> Save changes
                </>
              )}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <i className="fas fa-trash" aria-hidden="true" /> Delete enquiry
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
