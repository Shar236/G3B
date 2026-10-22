import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowUpRight, Bookmark, CalendarDays, ClipboardCheck, GraduationCap, LogOut, Mail, MessageSquare, Phone, UserRound } from 'lucide-react'
import { useStudent } from '../../context/StudentContext.jsx'
import { useSiteContent } from '../../components/layout/PublicLayout.jsx'
import ConsultationForm, { COUNTRY_DIAL_CODES } from '../../components/ui/ConsultationForm.jsx'
import studentApi from '../../api/studentApi.js'
import { parseApiError, resolveMediaUrl } from '../../api/client.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const statusLabels = { new: 'Enquiry received', contacted: 'Team contacted you', in_progress: 'Enquiry in progress', qualified: 'Under discussion', converted: 'Guidance arranged', completed: 'Enquiry completed', closed: 'Enquiry closed', archived: 'Archived' }
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''
const planningSteps = [['research-options','Research suitable universities and programs'],['check-requirements','Check current entry requirements'],['build-budget','Build a complete study budget'],['prepare-documents','Prepare academic and identity documents'],['review-deadlines','Confirm official application deadlines']]

export default function StudentDashboard() {
  const { student, loading, error: sessionError, refresh, logout, invalidate } = useStudent()
  const { data: site } = useSiteContent()
  const [enquiries, setEnquiries] = useState([])
  const [assessments, setAssessments] = useState([])
  const [availableAssessments, setAvailableAssessments] = useState([])
  const [studyAbroad, setStudyAbroad] = useState({ universities: [], programs: [] })
  const [preferences, setPreferences] = useState({ preferredDestinations: '', degreeLevel: '', subjectInterests: '', budgetAmount: '', budgetCurrency: 'INR' })
  const [planningBusy, setPlanningBusy] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const requestVersion = useRef(0)
  useDocumentMeta({ title: 'Your Student Dashboard | G3B Education', description: 'Your private G3B Education profile and counselling enquiries.', robots: 'noindex,nofollow,noarchive' })
  const loadDashboard = useCallback(async () => {
    if (!student) return
    const current = ++requestVersion.current
    setFetching(true)
    setError('')
    try {
      const response = await studentApi.get('/api/student/dashboard')
      if (current === requestVersion.current) {
        const data = response.data.data
        setEnquiries(data.enquiries || [])
        setAssessments(data.assessments || [])
        setAvailableAssessments(data.availableAssessments || [])
        const planning = data.studyAbroad || { universities: [], programs: [] }
        setStudyAbroad(planning)
        setPreferences({ preferredDestinations: planning.preferences?.preferredDestinations || '', degreeLevel: planning.preferences?.degreeLevel || '', subjectInterests: planning.preferences?.subjectInterests || '', budgetAmount: planning.preferences?.budgetAmount || '', budgetCurrency: planning.preferences?.budgetCurrency || 'INR' })
      }
    } catch (err) {
      if (current === requestVersion.current) {
        const parsed = parseApiError(err)
        if (parsed.status === 401) invalidate()
        else setError(parsed.message)
      }
    } finally { if (current === requestVersion.current) setFetching(false) }
  }, [student, invalidate])
  useEffect(() => { loadDashboard(); return () => { requestVersion.current += 1 } }, [loadDashboard])
  const signOut = async () => {
    setSigningOut(true)
    try { await logout() } catch (err) { setError(parseApiError(err).message) } finally { setSigningOut(false) }
  }
  const savePreferences = async (event) => { event.preventDefault(); setPlanningBusy(true); try { const response = await studentApi.put('/api/student/study-preferences', preferences); setStudyAbroad(response.data.data) } catch (err) { setError(parseApiError(err).message) } finally { setPlanningBusy(false) } }
  const togglePlan = async (key, completed) => { setPlanningBusy(true); try { const response = await studentApi.put(`/api/student/application-checklist/${key}`, { completed }); setStudyAbroad(response.data.data) } catch (err) { setError(parseApiError(err).message) } finally { setPlanningBusy(false) } }

  if (loading) return <div className="student-page-state container" role="status">Checking your student session…</div>
  if (sessionError) return <div className="student-page-state container" role="alert"><h1>Unable to load your student account</h1><p>{sessionError}</p><button className="btn btn-primary" onClick={refresh}>Try again</button></div>
  if (!student) return <Navigate to="/student/login" replace />

  const phone = student.phone.replace(/\D/g, '')
  const dialCode = COUNTRY_DIAL_CODES.map((country) => country.code).sort((a, b) => b.length - a.length).find((code) => student.phone.startsWith(code)) || '+91'
  const localPhone = student.phone.startsWith(dialCode) ? phone.slice(dialCode.length - 1) : ''

  return (
    <div className="student-dashboard container">
      <div className="student-dashboard-welcome"><div><span className="student-eyebrow"><GraduationCap size={18} aria-hidden="true" /> YOUR STUDENT DASHBOARD</span><h1>Welcome, {student.name.split(' ')[0]}.</h1><p>Your next step starts with a conversation.</p></div><button type="button" className="student-signout" onClick={signOut} disabled={signingOut}><LogOut size={17} aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
      <div className="student-dashboard-grid">
        <aside className="student-profile-card"><span className="student-profile-avatar"><UserRound size={29} aria-hidden="true" /></span><h2>Your profile</h2><strong>{student.name}</strong><p><Mail size={16} aria-hidden="true" /><span>{student.email}</span></p><p><Phone size={16} aria-hidden="true" /><span>{student.phone}</span></p><div className="student-profile-help">Need to update your contact details? Contact the G3B team at <a href="mailto:admissions.g3beducation@gmail.com">admissions.g3beducation@gmail.com</a>.</div><Link to="/services" className="student-resource-link">Explore our services<ArrowUpRight size={17} aria-hidden="true" /></Link></aside>
        <section className="student-enquiries"><div className="student-section-heading"><div><span className="student-eyebrow">YOUR CONVERSATIONS</span><h2>Counselling enquiries</h2></div><a href="#student-book-session" className="student-inline-link">Request a session <ArrowUpRight size={16} aria-hidden="true" /></a></div><p className="student-section-intro">Enquiries sent while signed in appear here. Preferred dates are requests; our team will confirm availability with you.</p>
          {error ? <div className="student-notice" role="alert">{error} <button onClick={loadDashboard} type="button">Try again</button></div> : null}
          {fetching ? <p role="status">Loading your enquiries…</p> : !error && enquiries.length === 0 ? <div className="student-empty"><MessageSquare size={32} aria-hidden="true" /><h3>Let’s talk about your goals</h3><p>You have no counselling enquiries in your student account yet. Use the form below to start.</p><a className="student-inline-link" href="#student-book-session">Request your first session <ArrowUpRight size={17} /></a></div> : <div className="student-enquiry-list">{enquiries.map((enquiry) => <article className="student-enquiry-card" key={enquiry.id}><div><span className="student-status">{statusLabels[enquiry.status] || 'Enquiry received'}</span><span className="student-reference">#{enquiry.id}</span></div><h3>{enquiry.serviceInterest}</h3><p className="student-enquiry-date"><CalendarDays size={15} aria-hidden="true" />Submitted {dateLabel(enquiry.createdAt)}</p>{enquiry.preferredDestination ? <p>Destination: {enquiry.preferredDestination}</p> : null}{enquiry.preferredDate || enquiry.preferredTime ? <p>Preferred contact: {dateLabel(enquiry.preferredDate)} {enquiry.preferredTime}</p> : null}{enquiry.message ? <p className="student-enquiry-message">{enquiry.message}</p> : null}</article>)}</div>}
        </section>
      </div>
      <section className="student-tools-grid">
        <article className="student-tool-panel"><div className="student-section-heading"><div><span className="student-eyebrow"><ClipboardCheck size={16} /> ASSESSMENTS</span><h2>Your assessment journey</h2></div><Link className="student-inline-link" to="/assessments">Explore assessments <ArrowUpRight size={16} /></Link></div>
          {fetching ? <p role="status">Loading assessments…</p> : assessments.length ? <div className="student-tool-list">{assessments.map((assessment) => <div key={assessment.id}><div><strong>{assessment.title}</strong><span className={`student-assessment-status ${assessment.status}`}>{String(assessment.status || 'not_started').replaceAll('_', ' ')}</span></div><p>{assessment.recommendation || assessment.summary}</p>{assessment.status === 'completed' && assessment.reportFileName ? <a className="student-inline-link" href={resolveMediaUrl(`/api/student/assessments/${assessment.id}/report`)}>Download private report <ArrowUpRight size={15} /></a> : assessment.accessMode === 'external' && assessment.launchUrl ? <a className="student-inline-link" href={assessment.launchUrl} target="_blank" rel="noopener noreferrer">Open assessment <ArrowUpRight size={15} /></a> : <small>Your G3B counsellor will confirm the next step.</small>}</div>)}</div> : <div className="student-empty compact"><ClipboardCheck size={28} /><h3>No assessment requests yet</h3><p>{availableAssessments.length ? `${availableAssessments.length} guided assessment options are currently available.` : 'Published assessment options will appear when available.'}</p><Link className="student-inline-link" to="/assessments">Browse assessments <ArrowUpRight size={15} /></Link></div>}
        </article>
        <article className="student-tool-panel"><div className="student-section-heading"><div><span className="student-eyebrow"><Bookmark size={16} /> SAVED OPTIONS</span><h2>Your study abroad shortlist</h2></div><Link className="student-inline-link" to="/study-abroad/my-dream-college">Explore catalogue <ArrowUpRight size={16} /></Link></div>
          {fetching ? <p role="status">Loading your shortlist…</p> : studyAbroad.universities?.length || studyAbroad.programs?.length ? <div className="student-tool-list">{studyAbroad.universities?.map((item) => <div key={`u-${item.id}`}><strong>{item.name}</strong><p>{[item.city,item.country].filter(Boolean).join(', ')}</p><Link className="student-inline-link" to={`/study-abroad/universities/${item.slug}`}>University details <ArrowUpRight size={15} /></Link></div>)}{studyAbroad.programs?.map((item) => <div key={`p-${item.id}`}><strong>{item.name}</strong><p>{[item.universityName,item.country].filter(Boolean).join(' · ')}</p><Link className="student-inline-link" to={`/study-abroad/programs/${item.slug}`}>Program details <ArrowUpRight size={15} /></Link></div>)}</div> : <div className="student-empty compact"><Bookmark size={28} /><h3>Your shortlist is empty</h3><p>Save verified colleges and programs while you explore. They will stay here for your next counselling conversation.</p><Link className="student-inline-link" to="/study-abroad/my-dream-college">Find options <ArrowUpRight size={15} /></Link></div>}
        </article>
      </section>
      <section className="student-planning-panel"><div><span className="student-eyebrow">PERSONALISED PLANNING</span><h2>Your study preferences</h2><p>Save the criteria you want to use during research and counselling.</p><form className="student-preferences" onSubmit={savePreferences}><label>Preferred destinations<input value={preferences.preferredDestinations} onChange={(e) => setPreferences({ ...preferences, preferredDestinations: e.target.value })} placeholder="e.g. UK, Canada" /></label><label>Intended degree level<input value={preferences.degreeLevel} onChange={(e) => setPreferences({ ...preferences, degreeLevel: e.target.value })} placeholder="e.g. Master's" /></label><label>Subject interests<input value={preferences.subjectInterests} onChange={(e) => setPreferences({ ...preferences, subjectInterests: e.target.value })} placeholder="e.g. Data science" /></label><label>Annual budget<div><input type="number" min="0" value={preferences.budgetAmount} onChange={(e) => setPreferences({ ...preferences, budgetAmount: e.target.value })} /><select value={preferences.budgetCurrency} onChange={(e) => setPreferences({ ...preferences, budgetCurrency: e.target.value })}><option>INR</option><option>USD</option><option>GBP</option><option>CAD</option><option>AUD</option><option>EUR</option></select></div></label><button className="btn btn-primary" type="submit" disabled={planningBusy}>{planningBusy ? 'Saving…' : 'Save preferences'}</button></form></div><div><span className="student-eyebrow">APPLICATION PLAN</span><h2>Your planning checklist</h2><p>Use this as a personal preparation list. Completing an item does not submit an application.</p><div className="student-checklist">{planningSteps.map(([key,label]) => { const checked = Boolean(studyAbroad.checklist?.find((item) => item.itemKey === key)?.isCompleted); return <label key={key}><input type="checkbox" checked={checked} disabled={planningBusy} onChange={(e) => togglePlan(key,e.target.checked)} /><span>{label}</span></label> })}</div>{studyAbroad.comparisons?.length ? <div className="student-recent"><h3>Saved comparison ({studyAbroad.comparisons.length})</h3>{studyAbroad.comparisons.map((item) => <Link key={item.id} to={`/study-abroad/programs/${item.slug}`}>{item.name}<ArrowUpRight size={14} /></Link>)}</div> : null}{studyAbroad.recent?.length ? <div className="student-recent"><h3>Recently viewed</h3>{studyAbroad.recent.map((item) => <Link key={`${item.itemType}-${item.id}`} to={`/study-abroad/${item.itemType === 'program' ? 'programs' : 'universities'}/${item.slug}`}>{item.name}<ArrowUpRight size={14} /></Link>)}</div> : null}</div></section>
      <section id="student-book-session" className="student-booking"><div><span className="student-eyebrow">TAKE YOUR NEXT STEP</span><h2>A little guidance.<br />A lot more clarity.</h2><p>Tell us what you have in mind. Our team will contact you to discuss your goals and arrange a suitable time.</p><p className="student-booking-note"><CalendarDays size={21} aria-hidden="true" />Submitting this form sends an enquiry. Your session is arranged only after our team confirms it.</p></div><div className="student-booking-form"><h3>Request free counselling</h3><ConsultationForm key={student.id} initialValues={{ fullName: student.name, email: student.email, phone: localPhone, dialCode, leadSource: 'student-dashboard' }} options={site?.enquiryOptions || []} destinations={site?.destinations || []} theme="light" onSuccess={loadDashboard} /></div></section>
    </div>
  )
}
