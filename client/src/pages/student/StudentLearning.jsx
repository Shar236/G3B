import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import studentApi from '../../api/studentApi.js'
import { parseApiError } from '../../api/client.js'
import { uploadFileDirect } from '../../api/storageUpload.js'
import { useStudent } from '../../context/StudentContext.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import './learning.css'

const labelDate = (date) => date ? new Date(date).toLocaleDateString() : 'No deadline'

export default function StudentLearning() {
  const { student, loading, refresh, invalidate } = useStudent()
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useDocumentMeta({ title: 'Assignments & Documents | G3B Education', robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    if (!student) return
    try {
      const response = await studentApi.get('/api/student/learning')
      setAssignments(response.data.data.assignments)
      setAnnouncements(response.data.data.announcements)
      setProfile({ name: student.name, phone: student.phone })
    } catch (err) {
      if (parseApiError(err).status === 401) invalidate()
      else setError(parseApiError(err).message)
    }
  }, [student, invalidate])
  useEffect(() => { load() }, [load])

  const open = async (id) => {
    try { setSelected((await studentApi.get(`/api/student/learning/${id}`)).data.data) }
    catch (err) { setError(parseApiError(err).message) }
  }
  const run = async (action, message) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(message); await load() }
    catch (err) { setError(parseApiError(err).message) }
    finally { setBusy(false) }
  }
  const download = async (file) => {
    try {
      const response = await studentApi.get(`/api/student/learning/files/${file.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(parseApiError(err).message) }
  }
  const submit = (file) => {
    if (!file || !selected) return
    run(async () => {
      const ticket = await uploadFileDirect(
        studentApi,
        `/api/student/learning/${selected.id}/upload-url`,
        {},
        file,
      )
      await studentApi.post(`/api/student/learning/${selected.id}/submission`, {
        storageKey: ticket.path,
        originalName: file.name,
        contentType: file.type,
        size: file.size,
      })
      await open(selected.id)
    }, 'Your work was submitted.')
  }
  if (loading) return <div className="container student-page-state" role="status">Checking your account…</div>
  if (!student) return <Navigate to="/student/login" replace />

  return <main className="container student-learning">
    <header><span className="student-eyebrow">YOUR LEARNING SPACE</span><h1>Assignments & documents</h1><p>Private resources and work shared with your account.</p><Link to="/student/dashboard">← Back to dashboard</Link></header>
    {error ? <p className="student-notice" role="alert">{error}</p> : null}
    {notice ? <p className="student-notice" role="status">{notice}</p> : null}
    <div className="student-learning-grid">
      <section className="student-tool-panel"><h2>Your assignments</h2>{!assignments.length ? <div className="student-empty compact"><h3>Nothing assigned yet</h3><p>Your counsellor will share work or documents here when they are ready.</p></div> : <div className="student-tool-list">{assignments.map((item) => <button type="button" key={item.id} onClick={() => open(item.id)} className={selected?.id === item.id ? 'selected' : ''}><strong>{item.title}</strong><small>{item.category} · Due {labelDate(item.due_at)}</small><span>{item.reviewed_at ? 'Reviewed' : item.submitted_at ? 'Submitted' : item.viewed_at ? 'Viewed' : 'Assigned'}</span></button>)}</div>}</section>
      <section className="student-tool-panel"><h2>{selected?.title || 'Select an assignment'}</h2>{selected ? <><p>{selected.description}</p><p className="student-learning-instructions">{selected.instructions}</p><p><strong>Due:</strong> {labelDate(selected.due_at)}</p><h3>Files from G3B</h3>{selected.files.length ? <ul>{selected.files.map((file) => <li key={file.id}><button type="button" className="student-inline-link" onClick={() => download(file)}>Download {file.filename}</button></li>)}</ul> : <p>No files attached.</p>}<h3>Your submission</h3>{selected.submitted_at ? <p>Submitted {new Date(selected.submitted_at).toLocaleString()}{selected.reviewed_at ? ' · Reviewed' : ''}</p> : <p>No submission yet.</p>}{selected.feedback ? <p><strong>Feedback:</strong> {selected.feedback}</p> : null}{selected.marks ? <p><strong>Marks:</strong> {selected.marks}</p> : null}<label className="btn btn-primary">{busy ? 'Uploading…' : selected.submitted_at ? 'Replace submission PDF' : 'Submit your PDF'}<input type="file" hidden accept="application/pdf,.pdf" disabled={busy} onChange={(e) => submit(e.target.files?.[0])} /></label></> : <p>Choose an assignment to view instructions and download its files.</p>}</section>
    </div>
    <section className="student-tool-panel"><h2>Announcements</h2>{!announcements.length ? <p>No announcements yet.</p> : announcements.map((item) => <article className="student-announcement" key={item.id}><h3>{item.title}</h3><p>{item.body}</p><small>{labelDate(item.published_at)}</small></article>)}</section>
    <section className="student-tool-panel"><h2>Your account</h2><div className="student-learning-grid"><form className="student-learning-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await studentApi.patch('/api/student/profile', profile); await refresh() }, 'Profile updated.') }}><h3>Profile</h3><label>Name<input required minLength={2} maxLength={150} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label><label>Phone<input required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label><button className="btn btn-secondary" type="submit" disabled={busy}>Save profile</button></form><form className="student-learning-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await studentApi.post('/api/student/change-password', password); invalidate() }, 'Password changed. Please sign in again.') }}><h3>Change password</h3><label>Current password<input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></label><label>New password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></label><button className="btn btn-secondary" type="submit" disabled={busy}>Change password</button></form></div></section>
  </main>
}
