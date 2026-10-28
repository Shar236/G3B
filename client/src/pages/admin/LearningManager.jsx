import { useCallback, useEffect, useState } from 'react'
import api, { parseApiError } from '../../api/client.js'
import { uploadFileDirect } from '../../api/storageUpload.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import './learning.css'

const empty = { title: '', description: '', instructions: '', category: 'general', dueAt: '', status: 'draft' }
const endpoint = '/api/admin/learning'
const get = (url) => api.get(url).then((response) => response.data.data)
const download = async (url, filename) => {
  const response = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  URL.revokeObjectURL(href)
}

export default function LearningManager() {
  const [items, setItems] = useState([])
  const [students, setStudents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(empty)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [announcement, setAnnouncement] = useState({ title: '', body: '', status: 'draft' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const [assignments, studentRows, announcementsRows, notificationRows] = await Promise.all([
        get(`${endpoint}/assignments`), get(`${endpoint}/students`), get(`${endpoint}/announcements`), get(`${endpoint}/notifications`),
      ])
      setItems(assignments)
      setStudents(studentRows)
      setAnnouncements(announcementsRows)
      setNotifications(notificationRows)
    } catch (err) { setError(parseApiError(err).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const open = async (id) => {
    setError('')
    if (!id) { setSelected(null); setForm(empty); setSelectedStudents([]); return }
    try {
      const item = await get(`${endpoint}/assignments/${id}`)
      setSelected(item)
      setForm({
        title: item.title, description: item.description || '', instructions: item.instructions || '',
        category: item.category, dueAt: item.due_at ? new Date(item.due_at).toISOString().slice(0, 16) : '', status: item.status,
      })
      setSelectedStudents(item.targets.map((student) => student.id))
    } catch (err) { setError(parseApiError(err).message) }
  }
  const run = async (action, success) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); await load() }
    catch (err) { setError(parseApiError(err).message) }
    finally { setBusy(false) }
  }
  const save = (event) => {
    event.preventDefault()
    run(async () => {
      const payload = { ...form, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null }
      const response = selected
        ? await api.patch(`${endpoint}/assignments/${selected.id}`, payload)
        : await api.post(`${endpoint}/assignments`, payload)
      await open(response.data.data.id)
    }, 'Assignment saved.')
  }
  const assign = () => run(async () => {
    await api.post(`${endpoint}/assignments/${selected.id}/targets`, { studentIds: selectedStudents })
    await open(selected.id)
  }, 'Students assigned.')
  const upload = (file) => {
    if (!file) return
    run(async () => {
      const ticket = await uploadFileDirect(
        api,
        '/api/admin/uploads/sign',
        { purpose: 'learning-file', assignmentId: selected.id },
        file,
      )
      await api.post(`${endpoint}/assignments/${selected.id}/files`, {
        storageKey: ticket.path,
        originalName: file.name,
        contentType: file.type,
        size: file.size,
      })
      await open(selected.id)
    }, 'PDF uploaded.')
  }
  const review = (submission, feedback, marks) => run(async () => {
    await api.patch(`${endpoint}/submissions/${submission.id}`, { feedback, marks })
    await open(selected.id)
  }, 'Feedback saved.')
  const saveAnnouncement = (event) => {
    event.preventDefault()
    run(async () => {
      await api.post(`${endpoint}/announcements`, announcement)
      setAnnouncement({ title: '', body: '', status: 'draft' })
    }, 'Announcement saved.')
  }

  return <div className="learning-manager">
    <header className="admin-card-head"><div><h1>Assignments & documents</h1><p>Publish work, share private PDFs, review submissions and post student notices.</p></div><button className="btn btn-primary" type="button" onClick={() => open(null)}>New assignment</button></header>
    {error ? <p className="form-notice plain error" role="alert">{error}</p> : null}
    {notice ? <p className="form-notice plain success" role="status">{notice}</p> : null}
    <div className="learning-admin-grid">
      <section className="admin-card" aria-label="Assignments list">
        <h2>Assignments</h2>
        {!items.length ? <StateBlock variant="empty" title="No assignments yet" message="Create one to share work or a learning document." /> : <div className="learning-list">{items.map((item) =>
          <button type="button" key={item.id} className={selected?.id === item.id ? 'is-active' : ''} onClick={() => open(item.id)}>
            <strong>{item.title}</strong><small>{item.category} · {item.status} · {item.assigned_count} students · {item.submitted_count} submissions</small>
          </button>)}</div>}
      </section>
      <section className="admin-card" aria-label="Assignment editor">
        <h2>{selected ? 'Edit assignment' : 'Create assignment'}</h2>
        <form className="learning-form" onSubmit={save}>
          <label>Title<input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Description<textarea maxLength={10000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Instructions<textarea maxLength={20000} rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
          <div className="learning-form-row"><label>Category<input maxLength={80} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Due date<input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label></div>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save assignment'}</button>
        </form>
        {selected ? <>
          <div className="learning-subsection"><h3>Assigned students</h3><p>Select one or more students. Use Select all for a registered-student cohort.</p><div className="learning-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedStudents(students.map((item) => item.id))}>Select all</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedStudents([])}>Clear</button></div><div className="learning-students">{students.map((item) => <label key={item.id}><input type="checkbox" checked={selectedStudents.includes(item.id)} onChange={(e) => setSelectedStudents((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />{item.name} <small>{item.email}</small></label>)}</div><button className="btn btn-secondary" type="button" disabled={busy || !selectedStudents.length} onClick={assign}>Assign selected students</button></div>
          <div className="learning-subsection"><h3>Private PDF attachments</h3><label className="btn btn-secondary">Upload PDF<input type="file" accept="application/pdf,.pdf" hidden disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label><ul>{selected.files.map((file) => <li key={file.id}><button type="button" className="student-inline-link" onClick={() => download(`${endpoint}/assignments/${selected.id}/files/${file.id}`, file.filename)}>{file.filename}</button><button type="button" disabled={busy} onClick={() => run(async () => { await api.delete(`${endpoint}/assignments/${selected.id}/files/${file.id}`); await open(selected.id) }, 'File removed.')}>Remove</button></li>)}</ul></div>
          <div className="learning-subsection"><h3>Submissions</h3>{!selected.submissions.length ? <p>No submissions yet.</p> : selected.submissions.map((submission) => <Submission key={submission.id} item={submission} onDownload={() => download(`${endpoint}/submissions/${submission.id}/file`, submission.filename)} onReview={review} busy={busy} />)}</div>
        </> : null}
      </section>
    </div>
    <section className="admin-card learning-announcements"><h2>Student announcements</h2><form className="learning-form" onSubmit={saveAnnouncement}><label>Title<input required maxLength={200} value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} /></label><label>Message<textarea required maxLength={10000} rows={3} value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} /></label><label>Status<select value={announcement.status} onChange={(e) => setAnnouncement({ ...announcement, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label><button className="btn btn-primary" type="submit" disabled={busy}>Save announcement</button></form><div className="learning-list">{announcements.map((item) => <div key={item.id}><strong>{item.title}</strong><small>{item.status} · {new Date(item.created_at).toLocaleDateString()}</small></div>)}</div></section>
    <section className="admin-card"><div className="admin-card-head"><div><h2>Assignment emails</h2><p>Delivery history for assignment notifications.</p></div><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => run(() => api.post(`${endpoint}/notifications/retry`), 'Pending emails retried.')}>Retry failed emails</button></div>{!notifications.length ? <p>No assignment emails queued yet.</p> : <div className="learning-list">{notifications.map((item) => <div key={item.id}><strong>{item.assignment_title} → {item.recipient}</strong><small>{item.status} · {item.attempts} attempt(s){item.last_error ? ` · ${item.last_error}` : ''}</small></div>)}</div>}</section>
  </div>
}

function Submission({ item, onDownload, onReview, busy }) {
  const [feedback, setFeedback] = useState(item.feedback || '')
  const [marks, setMarks] = useState(item.marks || '')
  return <div className="learning-submission"><strong>{item.name}</strong><small>{item.email} · {new Date(item.submitted_at).toLocaleString()}</small><button type="button" className="student-inline-link" onClick={onDownload}>Download {item.filename}</button><textarea aria-label={`Feedback for ${item.name}`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" /><input aria-label={`Marks for ${item.name}`} value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks" maxLength={40} /><button className="btn btn-secondary btn-sm" type="button" disabled={busy} onClick={() => onReview(item, feedback, marks)}>Save review</button></div>
}
