import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ExternalLink, GraduationCap, MapPin } from 'lucide-react'
import { api, parseApiError } from '../api/client.js'
import studentApi, { getStudentSession } from '../api/studentApi.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import { usePageSeo } from '../hooks/usePageSeo.js'
import '../styles/study-abroad.css'

const fields = {
  university: [['Overview','overview'],['Study areas','studyAreas'],['Degree levels','degreeLevels'],['Entry requirements','entryRequirements'],['English-language requirements','englishRequirements'],['Scholarships','scholarshipsText'],['Intakes','intakes'],['Deadlines','deadlinesText']],
  program: [['Overview','overview'],['Curriculum','curriculum'],['Learning outcomes','learningOutcomes'],['Entry requirements','entryRequirements'],['Academic prerequisites','academicPrerequisites'],['English-language requirements','englishRequirements'],['Additional costs','additionalCosts'],['Scholarships','scholarshipsText'],['Intakes','intakes'],['Deadlines','deadlinesText'],['Potential pathways','careerPathways']],
}
export default function StudyAbroadDetailPage({ type }) {
  const { slug } = useParams(), [item, setItem] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''); const { openModal } = useCounsellingModal()
  const route = type === 'program' ? `/study-abroad/programs/${slug}` : `/study-abroad/universities/${slug}`
  usePageSeo(route, { title: item ? `${item.name} | G3B Education` : 'Study Abroad Details | G3B Education', description: item?.overview || 'Review verified study abroad information and official sources.' })
  useEffect(() => { const controller = new AbortController(); api.get(`/api/${type === 'program' ? 'programs' : 'universities'}/${slug}`, { signal: controller.signal, notifyOnError: false }).then((response) => setItem(response.data?.data)).catch((err) => { if (!controller.signal.aborted) setError(parseApiError(err).message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [slug, type])
  useEffect(() => {
    if (!item?.id) return
    getStudentSession().then((session) => session?.student ? studentApi.put(`/api/student/recent-study/${type}/${item.id}`) : null).catch(() => {})
  }, [item?.id, type])
  if (loading) return <div className="container study-detail-state">Loading verified details…</div>
  if (error || !item) return <div className="container study-detail-state"><h1>Listing unavailable</h1><p>{error}</p><Link to={`/study-abroad/my-dream-${type === 'program' ? 'program' : 'college'}`}>Return to catalogue</Link></div>
  const location = [item.city, item.country].filter(Boolean).join(', ')
  return <article className="study-detail"><header><div className="container"><Link className="study-back" to={`/study-abroad/my-dream-${type === 'program' ? 'program' : 'college'}`}><ArrowLeft size={17} /> Back to {type === 'program' ? 'programs' : 'colleges'}</Link><p className="study-eyebrow">VERIFIED {type.toUpperCase()} PROFILE</p><h1>{item.name}</h1>{type === 'program' && item.universityName ? <p className="study-detail-lead">{item.universityName}</p> : null}<div className="study-detail-meta">{location ? <span><MapPin size={17} />{location}</span> : null}{item.degreeLevel || item.degreeLevels ? <span><GraduationCap size={17} />{item.degreeLevel || item.degreeLevels}</span> : null}{item.lastVerifiedDate ? <span><CalendarDays size={17} />Verified {new Date(item.lastVerifiedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span> : null}</div></div></header><div className="container study-detail-layout"><main>{fields[type].filter(([,key]) => item[key]).map(([label,key]) => <section key={key}><h2>{label}</h2><p>{item[key]}</p></section>)}{type === 'university' && item.programs?.length ? <section><h2>Published programs</h2><div className="study-program-links">{item.programs.map((program) => <Link key={program.id} to={`/study-abroad/programs/${program.slug}`}>{program.name}<ArrowRight size={16} /></Link>)}</div></section> : null}</main><aside><h2>Check the official source</h2><p>Always confirm current fees, deadlines and requirements before making an application decision.</p><a href={item.officialUrl} target="_blank" rel="noopener noreferrer">Official {type} page <ExternalLink size={16} /></a>{item.sourceUrl !== item.officialUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Information source <ExternalLink size={16} /></a> : null}<hr /><p><CheckCircle2 size={17} /> Source last checked by G3B on {new Date(item.lastVerifiedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}.</p><button type="button" className="btn btn-primary" onClick={() => openModal({ serviceInterest: 'Study Abroad', message: `I would like guidance about ${item.name}.` })}>Discuss this option</button></aside></div></article>
}
