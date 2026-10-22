import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, GraduationCap, LockKeyhole } from 'lucide-react'
import { useStudent } from '../../context/StudentContext.jsx'
import { parseApiError } from '../../api/client.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

export default function StudentAuth({ register = false }) {
  const { student, loading, error: sessionError, authenticate, refresh } = useStudent()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  useDocumentMeta({ title: `${register ? 'Create your student account' : 'Student sign in'} | G3B Education`, description: 'Access your G3B Education student profile and counselling enquiries.', robots: 'noindex,nofollow,noarchive' })

  if (student) return <Navigate to="/student/dashboard" replace />
  const update = (event) => { setForm((value) => ({ ...value, [event.target.name]: event.target.value })); setErrors((value) => ({ ...value, [event.target.name]: null })) }
  const submit = async (event) => {
    event.preventDefault()
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError('')
    setErrors({})
    try { await authenticate(register ? 'register' : 'login', form) }
    catch (err) { const parsed = parseApiError(err); setError(parsed.message); setErrors(parsed.details || {}) }
    finally { pendingRef.current = false; setPending(false) }
  }

  return (
    <section className="student-auth-wrap container">
      <div className="student-auth-story">
        <span className="student-eyebrow"><GraduationCap size={19} aria-hidden="true" /> YOUR G3B STUDENT SPACE</span>
        <h1>A clearer path starts with you.</h1>
        <p>Your goals, your guidance, and a place to keep your counselling enquiries together.</p>
        <ul className="student-benefits"><li><Check size={18} /> A private student profile</li><li><Check size={18} /> Your submitted counselling enquiries</li><li><Check size={18} /> A simple way to request your next session</li></ul>
        <div className="student-story-note"><BookOpen aria-hidden="true" /><span>Discover your strengths. Explore your options. Take your next step with G3B.</span></div>
      </div>
      <div className="student-auth-card">
        <span className="student-form-icon"><LockKeyhole size={24} aria-hidden="true" /></span>
        <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
        <p>{register ? 'Start your student journey with G3B Education.' : 'Sign in to your student dashboard.'}</p>
        {loading ? <p role="status">Checking your student session…</p> : null}
        {sessionError ? <div className="student-notice" role="alert">{sessionError} <button type="button" onClick={refresh}>Retry connection</button></div> : null}
        {error ? <div className="student-notice" role="alert">{error}</div> : null}
        <form onSubmit={submit} aria-busy={pending}>
          {register ? <div className="student-field"><label htmlFor="student-name">Full name</label><input id="student-name" name="name" value={form.name} onChange={update} minLength={2} maxLength={150} autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'student-name-error' : undefined} />{errors.name ? <span id="student-name-error">{errors.name}</span> : null}</div> : null}
          <div className="student-field"><label htmlFor="student-email">Email address</label><input id="student-email" type="email" name="email" value={form.email} onChange={update} maxLength={190} autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'student-email-error' : undefined} />{errors.email ? <span id="student-email-error">{errors.email}</span> : null}</div>
          {register ? <div className="student-field"><label htmlFor="student-phone">Phone number, with country code</label><input id="student-phone" type="tel" name="phone" value={form.phone} onChange={update} maxLength={26} autoComplete="tel" placeholder="+91 98765 43210" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'student-phone-error' : undefined} />{errors.phone ? <span id="student-phone-error">{errors.phone}</span> : null}</div> : null}
          <div className="student-field"><label htmlFor="student-password">Password</label><input id="student-password" type="password" name="password" value={form.password} onChange={update} minLength={register ? 10 : 1} maxLength={register ? 72 : 200} autoComplete={register ? 'new-password' : 'current-password'} required aria-invalid={Boolean(errors.password)} aria-describedby={register ? 'student-password-help' : undefined} />{register ? <small id="student-password-help">Use 10–72 characters. Choose a password you do not use elsewhere.</small> : null}{errors.password ? <span role="alert">{errors.password}</span> : null}</div>
          <button className="btn btn-primary student-submit" disabled={pending || loading}>{pending ? 'Please wait…' : register ? 'Create student account' : 'Sign in'}<ArrowRight size={18} aria-hidden="true" /></button>
        </form>
        <p className="student-auth-switch">{register ? 'Already have an account? ' : 'New to the student portal? '}<Link to={register ? '/student/login' : '/student/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
        <p className="student-privacy"><LockKeyhole size={14} aria-hidden="true" /> Only enquiries submitted while signed in appear here.</p>
      </div>
    </section>
  )
}
