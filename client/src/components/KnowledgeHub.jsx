import { useId, useRef, useState } from 'react'
import { ArrowDownToLine, BookOpen, CheckCircle2, LoaderCircle } from 'lucide-react'
import api, { parseApiError } from '../api/client.js'

function SubscribeForm() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const pendingRef = useRef(false)

  async function submit(event) {
    event.preventDefault()
    if (pendingRef.current) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 190) {
      setState('error'); setMessage('Please enter a valid email address.'); return
    }
    if (!consent) { setState('error'); setMessage('Please confirm your subscription consent to continue.'); return }
    pendingRef.current = true
    setState('loading'); setMessage('')
    try {
      await api.post('/api/subscribers', { email: email.trim(), consent: true, source: 'guide' }, { notifyOnError: false })
      setState('success')
      setMessage('Your guide is ready. Use the download link below to save your copy.')
    } catch (error) {
      setState('error'); setMessage(parseApiError(error).message || 'We couldn’t save your subscription. Please try again.')
    } finally {
      pendingRef.current = false
    }
  }

  if (state === 'success') return <div className="hub-success"><p role="status"><CheckCircle2 size={21} aria-hidden="true" />{message}</p><a className="btn btn-primary" href="/resources/g3b-global-education-guide.pdf" download><ArrowDownToLine size={17} aria-hidden="true" /> Download your free guide</a></div>

  return <form className="hub-form" onSubmit={submit} noValidate aria-busy={state === 'loading'}>
    <label htmlFor={`${id}-email`}>Your email address</label>
    <div className="hub-input-row"><input id={`${id}-email`} type="email" autoComplete="email" name="email" placeholder="you@example.com" maxLength={190} value={email} onChange={(event) => { setEmail(event.target.value); if (state === 'error') { setState('idle'); setMessage('') } }} required aria-invalid={state === 'error'} aria-describedby={message ? `${id}-feedback` : undefined} /><button className="btn btn-primary" type="submit" disabled={state === 'loading'}>{state === 'loading' ? <LoaderCircle className="g3b-spin" size={18} aria-hidden="true" /> : <ArrowDownToLine size={17} aria-hidden="true" />}{state === 'loading' ? 'Saving…' : 'Get the guide'}</button></div>
    <label className="hub-consent" htmlFor={`${id}-consent`}><input type="checkbox" id={`${id}-consent`} checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I agree to receive education updates from G3B Education. I can unsubscribe at any time.</span></label>
    {message && <p className="hub-feedback" id={`${id}-feedback`} role="alert">{message}</p>}
  </form>
}

export default function KnowledgeHub({ allowSubscription = false }) {
  return <section className="section hub-section" id="knowledge-hub" aria-labelledby="hub-heading"><div className="container">
    <div className="section-head"><span className="g3b-eyebrow"><BookOpen size={16} aria-hidden="true" /> YOUR KNOWLEDGE ADVANTAGE</span><h2 className="section-title" id="hub-heading">Better informed. Better prepared.</h2><p className="section-subtitle">Useful resources and fresh perspectives for your global education journey.</p></div>
    <div className="hub-grid">
      <article className="hub-guide"><div className="guide-cover" aria-hidden="true"><span>G3B<br />EDUCATION</span><BookOpen size={46} strokeWidth={1.3} /><strong>Your Global<br />Education<br />Playbook</strong><small>PLAN WITH PURPOSE.</small></div><div className="guide-details"><span className="g3b-eyebrow">FREE PLANNING GUIDE · PDF</span><h3>A clearer plan starts here.</h3><p>A practical checklist for choosing a course, building your profile, planning costs and preparing your applications.</p>{allowSubscription ? <SubscribeForm /> : <a className="btn btn-primary" href="/resources/g3b-global-education-guide.pdf" download><ArrowDownToLine size={17} aria-hidden="true" /> Download your free guide</a>}</div></article>
    </div>
  </div></section>
}
