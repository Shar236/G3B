import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Compass, RotateCcw } from 'lucide-react'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

const questions = [
  { key: 'currentStatus', title: 'Where are you in your journey?', options: [['high_school', 'High school', 'Grade 9–12'], ['college', 'College / graduate', 'Planning my next degree'], ['working', 'Working professional', 'Ready for my next chapter']] },
  { key: 'targetDegree', title: 'What would you like to explore?', options: [['ug', 'Undergraduate', 'My first university degree'], ['pg', 'Postgraduate', 'A specialised master’s'], ['mba', 'MBA / executive study', 'Business & leadership'], ['undecided', 'Help me decide', 'I’m exploring my options']] },
  { key: 'preferredDestination', title: 'Where would you like to study?', options: [['USA', 'USA'], ['UK', 'UK'], ['Canada', 'Canada'], ['Australia', 'Australia'], ['Germany', 'Germany'], ['France', 'France'], ['Not decided yet', 'Open to options']] },
]

export default function PathwayFinder() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ currentStatus: '', targetDegree: '', preferredDestination: '' })
  const { openModal } = useCounsellingModal()
  const headingRef = useRef(null)
  const question = questions[step]

  function moveTo(next) {
    setStep(next)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function finish() {
    const serviceInterest = answers.currentStatus === 'high_school' ? 'Grade 9+ Counselling' : answers.currentStatus === 'working' ? 'Mid-Career & Working Professionals' : answers.targetDegree === 'mba' ? 'MBA & Executive Study Counselling' : 'University & Study Abroad Counselling'
    openModal({ ...answers, preferredDestination: answers.preferredDestination === 'Not decided yet' ? '' : answers.preferredDestination, serviceInterest, leadSource: 'assessment' })
  }

  return (
    <section className="section finder-section" id="pathway-finder" aria-labelledby="finder-heading">
      <div className="container">
        <div className="finder-shell">
          <div className="finder-intro">
            <span className="g3b-eyebrow"><Compass size={16} aria-hidden="true" /> YOUR NEXT STEP STARTS HERE</span>
            <h2 id="finder-heading">A little clarity.<br />A world of possibility.</h2>
            <p>Three quick questions help us understand your goals. Bring your answers straight into a free consultation.</p>
            <span className="finder-note"><Check size={16} aria-hidden="true" /> About a minute · No sign-up to explore</span>
          </div>
          <div className="finder-card">
            <div className="finder-progress" aria-label={`Question ${step + 1} of 3`}>
              {questions.map((item, index) => <span key={item.key} className={index <= step ? 'is-complete' : ''} />)}
            </div>
            <div className="finder-step-row"><span>QUESTION {step + 1} OF 3</span><button type="button" className="text-button" onClick={() => { setAnswers({ currentStatus: '', targetDegree: '', preferredDestination: '' }); moveTo(0) }} aria-label="Restart pathway finder"><RotateCcw size={14} aria-hidden="true" /> Start over</button></div>
            <fieldset className="finder-fieldset">
              <legend ref={headingRef} tabIndex={-1}>{question.title}</legend>
              <div className={`finder-options${step === 2 ? ' finder-destinations' : ''}`}>
                {question.options.map(([value, label, description]) => <label key={value} className={`finder-option${answers[question.key] === value ? ' is-selected' : ''}`}><input type="radio" name={question.key} value={value} checked={answers[question.key] === value} onChange={() => setAnswers((current) => ({ ...current, [question.key]: value }))} /><span><strong>{label}</strong>{description && <small>{description}</small>}</span>{answers[question.key] === value && <Check size={17} aria-hidden="true" />}</label>)}
              </div>
            </fieldset>
            <div className="finder-actions"><button type="button" className="text-button" onClick={() => moveTo(step - 1)} disabled={step === 0}><ArrowLeft size={16} aria-hidden="true" /> Back</button><button type="button" className="btn btn-primary" disabled={!answers[question.key]} onClick={step === 2 ? finish : () => moveTo(step + 1)}>{step === 2 ? 'Continue to free consultation' : 'Next question'}<ArrowRight size={16} aria-hidden="true" /></button></div>
            <p className="finder-disclaimer">A conversation starter to guide your counselling session.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
