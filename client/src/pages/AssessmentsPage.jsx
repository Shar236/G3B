import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Brain, CheckCircle2, Download, FileText, GraduationCap, Sparkles, Users } from 'lucide-react'
import { api, parseApiError } from '../api/client.js'
import studentApi, { getStudentSession } from '../api/studentApi.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import { usePageSeo } from '../hooks/usePageSeo.js'
import '../styles/assessments.css'

const groups = [
  { id: 'student-assessments', key: 'student', label: 'Student Assessments', icon: GraduationCap, intro: 'Age-appropriate guidance that helps students connect interests, strengths and learning preferences with informed next steps.' },
  { id: 'professional-assessments', key: 'professional', label: 'Professional Assessments', icon: Users, intro: 'Structured reflection for professionals considering growth, higher studies or a thoughtful career transition.' },
  { id: 'aptitude-insights', key: 'insights', label: 'Aptitude & Personality Insights', icon: Brain, intro: 'A clearer view of work style, aptitude and personality patterns—interpreted in context, not used as a label.' },
]

function AssessmentCard({ item, onRequest, busy }) {
  const deliverables = String(item.deliverables || '').split(/\r?\n/).filter(Boolean)
  return <article className="assessment-card">
    <span className="assessment-card-icon"><i className={item.icon || 'fas fa-compass'} aria-hidden="true" /></span>
    <div><p className="assessment-audience">{item.audience}</p><h3>{item.title}</h3><p>{item.summary}</p></div>
    {deliverables.length ? <ul>{deliverables.slice(0, 4).map((entry) => <li key={entry}><CheckCircle2 size={16} />{entry}</li>)}</ul> : null}
    <button type="button" className="assessment-text-button" onClick={() => onRequest(item)} disabled={busy === item.id}>{busy === item.id ? 'Sending request…' : 'Request this assessment'} <ArrowRight size={16} /></button>
  </article>
}

export default function AssessmentsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(null)
  const navigate = useNavigate()
  const { openModal } = useCounsellingModal()
  usePageSeo('/assessments', { title: 'Career & Student Assessments | G3B Education', description: 'Explore student, professional, aptitude and personality assessments with guided interpretation from G3B Education.' })

  useEffect(() => {
    const controller = new AbortController()
    api.get('/api/assessments', { signal: controller.signal, notifyOnError: false }).then((response) => setItems(response.data?.data || [])).catch((err) => { if (!controller.signal.aborted) setError(parseApiError(err).message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const grouped = useMemo(() => Object.fromEntries(groups.map((group) => [group.key, items.filter((item) => item.category === group.key)])), [items])
  const request = async (item) => {
    setNotice(''); setBusy(item.id)
    try {
      const session = await getStudentSession()
      if (!session?.student) { navigate('/student/login', { state: { from: '/assessments' } }); return }
      await studentApi.post(`/api/student/assessments/${item.id}/request`)
      setNotice(`${item.title} has been added to your student dashboard.`)
    } catch (err) {
      if (err?.response?.status === 401) navigate('/student/login', { state: { from: '/assessments' } })
      else setNotice(parseApiError(err).message)
    } finally { setBusy(null) }
  }

  return <div className="assessment-page">
    <section className="assessment-hero"><div className="container assessment-hero-inner" data-reveal>
      <span className="assessment-kicker"><Sparkles size={15} /> Guided insight, practical next steps</span>
      <h1>Discover Your Strengths.<br />Find Your Direction.</h1>
      <p>Thoughtful assessments can turn uncertainty into useful questions. G3B combines structured tools with human interpretation so every result leads to a realistic conversation.</p>
      <div className="assessment-hero-actions"><a className="btn btn-primary" href="#student-assessments">Explore assessments</a><button className="btn btn-outline" type="button" onClick={() => openModal({ serviceInterest: 'Psychometric Assessment' })}>Speak to a counsellor</button></div>
      <div className="assessment-trust"><span><CheckCircle2 size={17} /> Guided interpretation</span><span><CheckCircle2 size={17} /> Private student access</span><span><CheckCircle2 size={17} /> Action-focused reports</span></div>
    </div></section>

    <nav className="assessment-jump" aria-label="Assessment sections"><div className="container">{groups.map((group) => <a href={`#${group.id}`} key={group.id}>{group.label}</a>)}<a href="#sample-reports">Sample Reports</a></div></nav>

    <section className="assessment-intro container" data-reveal><span className="assessment-section-mark"><BarChart3 size={22} /></span><div><p className="assessment-eyebrow">ASSESSMENTS WITH CONTEXT</p><h2>A result is a starting point—not a verdict.</h2><p>Our process helps learners and professionals understand patterns, ask better questions and discuss suitable options with a qualified guide. Results do not guarantee admission, employment or career outcomes.</p></div></section>

    {notice ? <div className="container"><p className="assessment-notice" role="status">{notice}</p></div> : null}
    {groups.map((group, index) => <section className={`assessment-group${index % 2 ? ' assessment-group-tint' : ''}`} id={group.id} key={group.id}><div className="container">
      <header className="assessment-group-head" data-reveal><span><group.icon size={25} /></span><div><p className="assessment-eyebrow">{String(index + 1).padStart(2, '0')} / 03</p><h2>{group.label}</h2><p>{group.intro}</p></div></header>
      {loading ? <p role="status">Loading assessments…</p> : error ? <div className="assessment-empty"><h3>Assessments are temporarily unavailable</h3><p>{error}</p></div> : grouped[group.key]?.length ? <div className="assessment-grid">{grouped[group.key].map((item) => <AssessmentCard key={item.id} item={item} onRequest={request} busy={busy} />)}</div> : <div className="assessment-empty"><h3>This catalogue is being prepared</h3><p>Only reviewed assessment offerings are published. Speak with a counsellor for current availability.</p><button type="button" onClick={() => openModal({ serviceInterest: 'Psychometric Assessment' })}>Ask about availability <ArrowRight size={16} /></button></div>}
    </div></section>)}

    <section className="assessment-report" id="sample-reports"><div className="container assessment-report-grid">
      <div data-reveal><p className="assessment-eyebrow">SAMPLE REPORT</p><h2>See how insights become an action plan.</h2><p>Preview a fictional G3B sample report showing a strengths profile, interpretation notes and recommended discussion prompts. It contains no real student data.</p><div className="assessment-report-actions"><a className="btn btn-primary" href="/resources/g3b-sample-assessment-report.pdf" target="_blank" rel="noreferrer"><FileText size={17} /> Preview report</a><a className="btn btn-outline" href="/resources/g3b-sample-assessment-report.pdf" download><Download size={17} /> Download PDF</a></div></div>
      <a className="assessment-report-preview" href="/resources/g3b-sample-assessment-report.pdf" target="_blank" rel="noreferrer" aria-label="Open the sample assessment report"><span>G3B EDUCATION</span><strong>Student Strengths & Direction Profile</strong><small>Illustrative sample report</small><div><i style={{ width: '88%' }} /><i style={{ width: '70%' }} /><i style={{ width: '78%' }} /></div></a>
    </div></section>

    <section className="assessment-process container"><header><p className="assessment-eyebrow">HOW IT WORKS</p><h2>From questions to clear next steps.</h2></header><div>{['Choose the right assessment with guidance','Complete it in a focused setting','Review results with a counsellor','Turn insights into an action plan'].map((step, index) => <article key={step}><span>{index + 1}</span><h3>{step}</h3></article>)}</div></section>
    <section className="assessment-final"><div className="container" data-reveal><h2>Not sure which assessment fits?</h2><p>Tell us your stage and the decision you are trying to make. We’ll help you choose an appropriate next step.</p><button className="btn btn-primary" type="button" onClick={() => openModal({ serviceInterest: 'Psychometric Assessment' })}>Book a guidance conversation</button><Link to="/student/dashboard">Visit your student dashboard <ArrowRight size={16} /></Link></div></section>
  </div>
}
