import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addEnquiryNote, deleteEnquiry, deleteEnquiryNote, fetchEnquiryStats, getEnquiry, updateEnquiry } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { AdminNotice, ConfirmAction, displayDate, labelFor, LEAD_STATUSES, TableSkeleton } from './AdminDataUI.jsx'
import EnquiryForm, { enquiryFormValues, enquiryPayload } from './EnquiryForm.jsx'
import { invalidateAdminCollection } from './useAdminCollection.js'

function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function editableRecord(record) {
  return { ...enquiryFormValues(record), status: record.status, assignedTo: record.assignedTo || '', followUpAt: localDateTime(record.followUpAt) }
}

/** Complete lead record with assessment, follow-up, assignment and internal notes. */
export default function EnquiryDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const canDelete = user?.role === 'admin'
  const [enquiry, setEnquiry] = useState(null)
  const [assignees, setAssignees] = useState([])
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [note, setNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const busy = saving || deleting || noteSaving

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [record, stats] = await Promise.all([getEnquiry(id), fetchEnquiryStats()])
      setEnquiry(record)
      setForm(editableRecord(record))
      setAssignees((stats.assignees || []).filter((assignee) => ['admin', 'staff', 'counsellor'].includes(assignee.role)))
    } catch (cause) { setError(parseApiError(cause)) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async (event) => {
    event.preventDefault()
    const previous = enquiry
    const payload = {
      ...enquiryPayload(form),
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
    }
    setSaving(true)
    setNotice(null)
    setEnquiry({ ...previous, ...payload })
    try {
      const updated = await updateEnquiry(id, payload)
      setEnquiry({ ...updated, notes: previous.notes || [] })
      setForm(editableRecord(updated))
      invalidateAdminCollection('/api/admin/enquiries')
      setNotice({ type: 'success', message: 'Enquiry and follow-up saved.' })
    } catch (cause) {
      setEnquiry(previous)
      setNotice({ type: 'error', message: `${parseApiError(cause).message} Saved details have been restored; your edits are still available below.` })
    } finally { setSaving(false) }
  }

  const handleAddNote = async (event) => {
    event.preventDefault()
    if (!note.trim()) return
    setNoteSaving(true)
    try {
      const created = await addEnquiryNote(id, note.trim())
      setEnquiry((current) => ({ ...current, notes: [created, ...(current.notes || [])] }))
      setNote('')
      setNotice({ type: 'success', message: 'Internal note added.' })
    } catch (cause) { setNotice({ type: 'error', message: parseApiError(cause).message }) }
    finally { setNoteSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const previous = enquiry
    try {
      if (confirmation.noteId) {
        setEnquiry((current) => ({ ...current, notes: current.notes.filter((item) => item.id !== confirmation.noteId) }))
        await deleteEnquiryNote(id, confirmation.noteId)
        setNotice({ type: 'success', message: 'Internal note deleted.' })
      } else {
        await deleteEnquiry(id)
        invalidateAdminCollection('/api/admin/enquiries')
        navigate(adminPath('enquiries'), { replace: true })
      }
    } catch (cause) {
      setEnquiry(previous)
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally { setDeleting(false); setConfirmation(null) }
  }

  if (loading) return <div className="admin-card"><TableSkeleton columns={3} /></div>
  if (error) return <StateBlock variant="error" title="Could not load this enquiry" message={error.message} onRetry={load} />
  if (!enquiry) return <StateBlock variant="empty" title="Enquiry not found" />

  return <>
    <div className="admin-card">
      <div className="admin-card-head"><h2><i className="fas fa-envelope-open-text" aria-hidden="true" /> {enquiry.fullName}</h2><Link className="btn btn-ghost btn-sm" to={adminPath('enquiries')}>Back to enquiries</Link></div>
      <AdminNotice notice={notice} />
      <dl className="admin-assessment">
        <div><dt>Email</dt><dd><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></dd></div>
        <div><dt>Phone</dt><dd><a href={`tel:${enquiry.phone?.startsWith('+') ? enquiry.phone : `${enquiry.countryCode || ''}${enquiry.phone}`}`}>{enquiry.countryCode && !enquiry.phone?.startsWith('+') ? `${enquiry.countryCode} ` : ''}{enquiry.phone || '—'}</a></dd></div>
        <div><dt>Service category</dt><dd>{enquiry.serviceInterest}</dd></div><div><dt>Status</dt><dd>{labelFor(enquiry.status)}</dd></div>
        <div><dt>Submission date</dt><dd>{displayDate(enquiry.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{displayDate(enquiry.updatedAt)}</dd></div>
        <div><dt>Source / funnel step</dt><dd>{labelFor(enquiry.leadSource || enquiry.source || 'site')}</dd></div><div><dt>Landing page</dt><dd>{enquiry.landingPage || '—'}</dd></div>
        <div><dt>Assigned counsellor</dt><dd>{enquiry.assignedToName || 'Unassigned'}</dd></div><div><dt>Follow-up scheduled</dt><dd>{displayDate(enquiry.followUpAt)}</dd></div>
        <div><dt>Preferred contact date</dt><dd>{enquiry.preferredDate ? displayDate(enquiry.preferredDate) : 'Not specified'}</dd></div><div><dt>Preferred contact time (IST)</dt><dd>{enquiry.preferredTime || 'Not specified'}</dd></div>
      </dl>
      <h3>Pathway assessment responses</h3>
      <dl className="admin-assessment"><div><dt>Current class / status</dt><dd>{labelFor(enquiry.currentStatus)}</dd></div><div><dt>Target degree</dt><dd>{enquiry.targetDegree ? enquiry.targetDegree.toUpperCase() : '—'}</dd></div><div><dt>Preferred destination</dt><dd>{enquiry.preferredDestination || '—'}</dd></div></dl>
      <h3>Original message</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{enquiry.message || 'No message provided.'}</p>
    </div>

    <div className="admin-card">
      <h3><i className="fas fa-list-check" aria-hidden="true" /> Enquiry details & follow-up</h3>
      <form onSubmit={handleSave}>
        <EnquiryForm prefix="edit-enquiry" value={form} onChange={setForm} disabled={busy} />
        <div className="admin-grid-2">
          <div className="admin-field"><label htmlFor="enquiry-status">Status</label><select id="enquiry-status" className="admin-select" value={form.status} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}</select></div>
          <div className="admin-field"><label htmlFor="enquiry-assignee">Assigned counsellor</label><select id="enquiry-assignee" className="admin-select" value={form.assignedTo} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">Unassigned</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} ({assignee.role})</option>)}</select></div>
          <div className="admin-field"><label htmlFor="enquiry-followup">Next follow-up (your local time)</label><input id="enquiry-followup" className="admin-input" type="datetime-local" value={form.followUpAt} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, followUpAt: event.target.value }))} /><p className="hint">Clear the field to remove the scheduled follow-up.</p></div>
        </div>
        <div className="admin-action-group"><button type="submit" className="btn btn-primary" disabled={busy}>{saving ? 'Saving…' : 'Save changes'}</button>{canDelete ? <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirmation({ message: `Delete the enquiry from ${enquiry.fullName} and all its internal notes?` })}>Delete enquiry</button> : null}</div>
      </form>
    </div>

    <div className="admin-card">
      <h3><i className="fas fa-note-sticky" aria-hidden="true" /> Counsellor notes</h3><p className="row-sub">Internal notes are visible only to authorised team members.</p>
      <form onSubmit={handleAddNote}><div className="admin-field"><label htmlFor="enquiry-note">Add an internal note</label><textarea id="enquiry-note" className="admin-textarea" rows={3} required maxLength={5000} disabled={busy} value={note} onChange={(event) => setNote(event.target.value)} /></div><button type="submit" className="btn btn-secondary btn-sm" disabled={busy || !note.trim()}>{noteSaving ? 'Adding note…' : 'Add note'}</button></form>
      {enquiry.notes?.length ? <ul className="admin-notes">{enquiry.notes.map((item) => <li key={item.id}><div className="admin-notes-header"><span className="row-sub">{item.authorName || 'Team member'} · {displayDate(item.createdAt)}</span>{canDelete ? <button type="button" className="btn btn-danger btn-sm" aria-label={`Delete note by ${item.authorName || 'team member'}`} disabled={busy} onClick={() => setConfirmation({ noteId: item.id, title: 'Delete internal note', message: 'Delete this internal note?' })}>Delete note</button> : null}</div><p>{item.note}</p></li>)}</ul> : <p className="row-sub" style={{ marginTop: 18 }}>No internal notes yet.</p>}
    </div>
    <ConfirmAction action={confirmation} busy={deleting} onClose={() => setConfirmation(null)} onConfirm={handleDelete} />
  </>
}
