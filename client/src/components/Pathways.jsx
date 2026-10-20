import { useState } from 'react'
import { ArrowRight, BookOpen, BriefcaseBusiness, Check, Compass, GraduationCap, Presentation, Route, Sparkles } from 'lucide-react'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

const programmes = [
  { id: 'school', label: 'Grade 9–12', icon: BookOpen, eyebrow: 'START EARLY. GO FURTHER.', title: 'Big futures begin with small, confident steps.', description: 'A personalised pathway from your first subject choices to your first international university application.', service: 'Grade 9+ Counselling', source: 'grade9', status: 'high_school', cta: 'Plan my school journey', features: [
    { icon: Compass, title: 'Find your stream & subjects', text: 'Explore Science, Commerce and Humanities, with subject planning across CBSE, IB and Cambridge pathways.' },
    { icon: Sparkles, title: 'Build a profile with purpose', text: 'Connect your strengths to competitions, leadership, volunteering and meaningful community projects.' },
    { icon: Route, title: 'See the bigger picture', text: 'Create a multi-year roadmap for Grades 9–12: academic milestones, test preparation and university applications.' },
  ] },
  { id: 'university', label: 'University applicants', icon: GraduationCap, eyebrow: 'YOUR NEXT CHAPTER, ABROAD.', title: 'Turn global ambitions into a clear application plan.', description: 'Connect your academic interests, budget and long-term goals to a university and destination that fit.', service: 'University & Study Abroad Counselling', source: 'university', status: 'college', cta: 'Explore my university options', features: [
    { icon: Compass, title: 'Choose with clarity', text: 'Compare undergraduate and postgraduate courses, entry requirements and destination options.' },
    { icon: BookOpen, title: 'Make every application count', text: 'Plan tests, essays, recommendations and deadlines around a balanced university shortlist.' },
    { icon: Route, title: 'Prepare for the whole journey', text: 'Explore scholarship opportunities, visa documentation and practical pre-departure planning.' },
  ] },
  { id: 'workshops', label: 'Schools & workshops', icon: Presentation, eyebrow: 'CLARITY FOR EVERY COHORT.', title: 'Career conversations that move the whole room forward.', description: 'Practical, age-appropriate career counselling workshops for schools, colleges and group cohorts.', service: 'Career Counselling Workshops', source: 'workshop', cta: 'Discuss a workshop', features: [
    { icon: Compass, title: 'School discovery modules', text: 'Stream selection, career awareness and introductions to strengths and interests for Grades 9–12.' },
    { icon: GraduationCap, title: 'College readiness modules', text: 'Higher education pathways, study abroad planning, application skills and scholarship awareness.' },
    { icon: Presentation, title: 'A format that fits your group', text: 'Discuss your cohort size, learning goals, preferred dates and interactive Q&A needs with our team.' },
  ] },
  { id: 'professionals', label: 'Working professionals', icon: BriefcaseBusiness, eyebrow: 'EXPERIENCE MEETS POSSIBILITY.', title: 'Your next career move deserves a considered plan.', description: 'Mid-career resolve for professionals considering a new direction, global credentials or leadership roles.', service: 'Mid-Career & Working Professionals', source: 'professional', status: 'working', cta: 'Plan my next career move', features: [
    { icon: BriefcaseBusiness, title: 'Executive education & MBA', text: 'Explore executive master’s, specialised MBA programmes and study formats alongside your experience.' },
    { icon: Compass, title: 'A purposeful career pivot', text: 'Map transferable skills, skill gaps and your goals before choosing a new field or qualification.' },
    { icon: Route, title: 'Balance ambition with reality', text: 'Assess entry requirements, costs, time away from work and how a programme supports your career.' },
  ] },
]

export default function Pathways() {
  const [selected, setSelected] = useState('school')
  const { openModal } = useCounsellingModal()
  const programme = programmes.find((item) => item.id === selected)

  function onTabKeyDown(event, index) {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % programmes.length
    else if (event.key === 'ArrowLeft') next = (index + programmes.length - 1) % programmes.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = programmes.length - 1
    else return
    event.preventDefault()
    setSelected(programmes[next].id)
    document.getElementById(`pathway-tab-${programmes[next].id}`)?.focus()
  }

  return (
    <section className="section pathway-section" id="pathways" aria-labelledby="pathways-heading">
      <div className="container">
        <div className="section-head pathway-heading">
          <span className="g3b-eyebrow"><Compass size={16} aria-hidden="true" /> GUIDANCE AT EVERY STAGE</span>
          <h2 className="section-title" id="pathways-heading">A pathway as individual as you.</h2>
          <p className="section-subtitle">From Grade 9 to your next career chapter, find the right support for where you are today.</p>
        </div>
        <div className="pathway-tabs" role="tablist" aria-label="Choose your life stage">
          {programmes.map(({ id, label, icon: Icon }, index) => (
            <button type="button" key={id} id={`pathway-tab-${id}`} role="tab" aria-selected={selected === id} aria-controls={`pathway-panel-${id}`} tabIndex={selected === id ? 0 : -1} onKeyDown={(event) => onTabKeyDown(event, index)} onClick={() => setSelected(id)}>
              <Icon size={19} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <div className="pathway-panel" id={`pathway-panel-${programme.id}`} role="tabpanel" aria-labelledby={`pathway-tab-${programme.id}`} tabIndex={0}>
          <div className="pathway-intro">
            <span className="g3b-eyebrow">{programme.eyebrow}</span>
            <h3>{programme.title}</h3>
            <p>{programme.description}</p>
            <button className="btn btn-primary" type="button" onClick={() => openModal({ serviceInterest: programme.service, leadSource: programme.source, currentStatus: programme.status || '', targetDegree: 'undecided' })}>{programme.cta}<ArrowRight size={17} aria-hidden="true" /></button>
            <span className="pathway-reassurance"><Check size={15} aria-hidden="true" /> Start with a free conversation</span>
          </div>
          <div className="pathway-features">
            {programme.features.map(({ icon: Icon, title, text }, index) => (
              <article className="pathway-feature" key={title}>
                <span className="pathway-feature-icon"><Icon size={23} aria-hidden="true" /></span>
                <div><span className="pathway-step">0{index + 1}</span><h4>{title}</h4><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
