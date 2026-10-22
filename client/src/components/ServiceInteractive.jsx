import { useState } from 'react'
import { Check, CircleDot, FileCheck2, Languages, MapPin, Route, Sparkles } from 'lucide-react'

const presentations = {
  'career-counselling': { label:'Interactive career path', title:'Clarity develops through exploration.', icon:Route },
  'psychometric-assessment': { label:'Assessment view', title:'Several signals build a fuller picture.', icon:CircleDot },
  'profile-building': { label:'Development roadmap', title:'Build depth through connected experiences.', icon:Sparkles },
  'study-abroad': { label:'Destination pathway', title:'Compare the factors behind a good fit.', icon:MapPin },
  admissions: { label:'Application journey', title:'Move from requirements to a complete submission.', icon:FileCheck2 },
  scholarships: { label:'Funding framework', title:'Prioritise opportunities by fit and timing.', icon:Sparkles },
  'visa-guidance': { label:'Document readiness', title:'Organise each part of the application carefully.', icon:Check },
  'pre-departure': { label:'Departure timeline', title:'Prepare the practical details in sequence.', icon:Route },
  'english-test-preparation': { label:'Test preparation', title:'Choose a test, then focus your practice.', icon:Languages },
}

export default function ServiceInteractive({ service }) {
  const [active, setActive] = useState(0)
  const presentation = presentations[service.slug] || presentations['career-counselling']
  const Icon = presentation.icon
  const items = service.slug === 'english-test-preparation'
    ? [['IELTS','Compare the accepted score profile, speaking format and available dates.'],['TOEFL','Understand the computer-based tasks and integrated skill questions.'],['PTE','Review the test interface, automated scoring format and task timing.']]
    : service.process.slice(0,4)
  return <section className={`service-interactive si-${service.slug}`} aria-labelledby={`${service.slug}-interactive-title`}><div className="container"><header><span><Icon size={16} />{presentation.label}</span><h2 id={`${service.slug}-interactive-title`}>{presentation.title}</h2></header><div className="si-track" style={{ '--si-active': active }} role="tablist" aria-label={presentation.label}>{items.map(([title],index)=><button key={title} type="button" role="tab" aria-selected={active===index} aria-controls={`${service.slug}-stage-panel`} onClick={()=>setActive(index)}><i>{String(index+1).padStart(2,'0')}</i><strong>{title}</strong></button>)}</div><div className="si-panel" id={`${service.slug}-stage-panel`} role="tabpanel"><span>{String(active+1).padStart(2,'0')}</span><div><h3>{items[active][0]}</h3><p>{items[active][1]}</p></div></div></div></section>
}
