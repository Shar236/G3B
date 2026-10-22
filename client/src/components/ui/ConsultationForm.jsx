import { useState, useEffect, useId, useRef } from 'react'
import studentApi, { getStudentSession } from '../../api/studentApi.js'
import { parseApiError } from '../../api/client.js'

export const COUNTRY_DIAL_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ConsultationForm({
  initialValues = {},
  options = [],
  destinations = [],
  onSuccess,
  inModal = false,
  theme = inModal ? 'light' : 'dark',
}) {
  const id = useId()
  const pendingRef = useRef(false)
  const [form, setForm] = useState({
    fullName: initialValues.fullName || '',
    email: initialValues.email || '',
    dialCode: initialValues.dialCode || '+91',
    phone: initialValues.phone || '',
    serviceInterest: initialValues.serviceInterest || '',
    preferredDestination: initialValues.preferredDestination || '',
    message: initialValues.message || '',
    currentStatus: initialValues.currentStatus || '',
    targetDegree: initialValues.targetDegree || '',
    preferredDate: '',
    preferredTime: '',
  })

  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Update pre-selected values if initialValues changes
  useEffect(() => {
    if (initialValues?.serviceInterest) {
      setForm((prev) => ({ ...prev, serviceInterest: initialValues.serviceInterest }))
    }
    if (initialValues?.preferredDestination) {
      setForm((prev) => ({ ...prev, preferredDestination: initialValues.preferredDestination }))
    }
  }, [initialValues?.serviceInterest, initialValues?.preferredDestination])

  const update = (field) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.fullName || form.fullName.trim().length < 2 || form.fullName.trim().length > 150) {
      errs.fullName = 'Please enter your full name (at least 2 characters).'
    }
    if (!form.email || !EMAIL_REGEX.test(form.email.trim()) || form.email.trim().length > 190) {
      errs.email = 'Please provide a valid email address.'
    }

    const cleanPhone = form.phone.replace(/[\s()-]/g, '')
    if (!cleanPhone || cleanPhone.length < 7 || `${form.dialCode.replace('+', '')}${cleanPhone}`.length > 15 || !/^\d+$/.test(cleanPhone)) {
      errs.phone = 'Please enter a valid phone number (7 to 15 digits).'
    }

    if (!form.serviceInterest) {
      errs.serviceInterest = 'Please choose a service you are interested in.'
    }

    if (form.message && form.message.length > 2000) {
      errs.message = 'Message must be 2000 characters or fewer.'
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    if (form.preferredDate && form.preferredDate < today) errs.preferredDate = 'Please choose today or a future date.'

    return errs
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pendingRef.current) return
    setNotice(null)

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setNotice({ type: 'error', message: 'Please correct the highlighted fields before submitting.' })
      const formElement = event.currentTarget
      requestAnimationFrame(() => formElement.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const fullPhoneNumber = `${form.dialCode} ${form.phone.replace(/[\s()-]/g, '')}`

    pendingRef.current = true
    setSubmitting(true)
    try {
      const session = await getStudentSession()
      if (initialValues.leadSource === 'student-dashboard' && !session.student) {
        setNotice({ type: 'error', message: 'Your student session has expired. Sign in again before sending your enquiry.' })
        return
      }
      const res = await studentApi.post('/api/enquiries', {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: fullPhoneNumber,
          serviceInterest: form.serviceInterest,
          preferredDestination: form.preferredDestination || undefined,
          message: form.message.trim() || undefined,
          currentStatus: form.currentStatus || undefined,
          targetDegree: form.targetDegree || undefined,
          countryCode: form.dialCode,
          preferredDate: form.preferredDate || undefined,
          preferredTime: form.preferredTime || undefined,
          leadSource: initialValues.leadSource || (inModal ? 'consultation' : 'contact'),
          landingPage: `${window.location.pathname}${window.location.hash}`.slice(0, 500),
        })

      setSubmitted(true)
      if (onSuccess) onSuccess(res.data)
    } catch (error) {
      const parsed = parseApiError(error)
      if (parsed.details) setErrors(parsed.details)
      setNotice({
        type: 'error',
        message:
          parsed.status === 409
            ? 'We already received this request. Our team will contact you to discuss availability.'
            : parsed.message || 'Unable to submit your request. Please try again.',
      })
    } finally {
      pendingRef.current = false
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      fullName: initialValues.fullName || '',
      email: initialValues.email || '',
      dialCode: initialValues.dialCode || '+91',
      phone: initialValues.phone || '',
      serviceInterest: '',
      preferredDestination: '',
      message: '',
      currentStatus: '',
      targetDegree: '',
      preferredDate: '',
      preferredTime: '',
    })
    setErrors({})
    setNotice(null)
    setSubmitted(false)
  }

  if (submitted) {
    const isDark = theme === 'dark'
    return (
      <div className={`counselling-success-view consultation-form-${theme}`} style={{ textAlign: 'center', padding: inModal ? '24px 16px' : '36px 20px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '28px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          }}
        >
          <i className="fas fa-check" aria-hidden="true" />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#ffffff' : '#0B2C5F', margin: '0 0 8px 0' }}>
          Your enquiry has been received
        </h3>
        <p style={{ color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#475569', fontSize: '15px', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.6 }}>
          Thank you, <strong>{form.fullName}</strong>. Your enquiry for <strong>{form.serviceInterest}</strong> has been saved successfully.
        </p>
        <div
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#f8fafc',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            maxWidth: '440px',
            margin: '0 auto 20px',
            fontSize: '13px',
            color: isDark ? '#e2e8f0' : '#64748b',
          }}
        >
          <i className="fas fa-envelope" style={{ color: isDark ? '#fbbf24' : '#0B2C5F', marginRight: '6px' }} />
          Our team will contact you to discuss your goals and confirm a suitable session time. Your appointment is not confirmed yet.
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
          <i className="fas fa-rotate-left" aria-hidden="true" /> Send Another Enquiry
        </button>
      </div>
    )
  }

  // Combine options from enquiry options or services catalog
  let serviceOptions = options.length > 0
    ? options.map((opt) => opt.label)
    : [
        'Test Preparation & Language Support',
        'Career Guidance & Psychometric Assessment',
        'Assistance in University Selection',
        'Application & Visa Documentation',
        'Scholarship & Financial Assistance',
        'Accommodation & Travel Arrangements',
        'IELTS / TOEFL / PTE Coaching',
        'Other Inquiry',
      ]

  if (form.serviceInterest && !serviceOptions.includes(form.serviceInterest)) {
    serviceOptions = [form.serviceInterest, ...serviceOptions]
  }
  serviceOptions = [...new Set([...serviceOptions, 'Grade 9+ Counselling', 'Career Counselling Workshops', 'Mid-Career & Working Professionals', 'University & Study Abroad Counselling'])]
  const destinationOptions = [...new Set([...destinations.map((d) => d.country), 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', form.preferredDestination].filter(Boolean))]

  return (
    <div className={`consultation-form-wrapper consultation-form-${theme}`}>
      {initialValues.leadSource === 'assessment' && <div className="assessment-summary"><strong>Your pathway finder answers are included.</strong><span>{{ high_school: 'High school / Grade 9–12', college: 'College / graduate', working: 'Working professional' }[form.currentStatus]}</span><span>{{ ug: 'Undergraduate', pg: 'Postgraduate', mba: 'MBA / executive study', undecided: 'Help me decide' }[form.targetDegree]}</span><span>{form.preferredDestination || 'Open to destinations'}</span></div>}
      {notice ? (
        <div
          className={`form-notice ${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
          style={{ marginBottom: '16px' }}
        >
          <i
            className={notice.type === 'success' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'}
            aria-hidden="true"
          />
          <span>{notice.message}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        {/* Full Name */}
        <div className={`form-group${errors.fullName ? ' has-error' : ''}`}>
          <label htmlFor={`${id}-full-name`}>
            Full Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id={`${id}-full-name`}
              name="fullName"
              type="text"
              placeholder="e.g. Rahul Sharma"
              autoComplete="name"
              maxLength={150}
              value={form.fullName}
              onChange={update('fullName')}
              aria-invalid={Boolean(errors.fullName)}
              required
            />
          </div>
          {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
        </div>

        {/* Email & Phone Row */}
        <div className="form-row">
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-email`}>
              Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              placeholder="rahul@example.com"
              autoComplete="email"
              maxLength={190}
              value={form.email}
              onChange={update('email')}
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </div>

          <div className={`form-group${errors.phone ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-phone`}>
              Phone Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="phone-input-wrap">
              <select
                id={`${id}-dial-code`}
                aria-label="Country dial code"
                value={form.dialCode}
                onChange={update('dialCode')}
                className="dial-code-select"
              >
                {COUNTRY_DIAL_CODES.map((c) => (
                  <option key={c.code + c.country} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                placeholder="98201 23456"
                autoComplete="tel"
                maxLength={24}
                value={form.phone}
                onChange={update('phone')}
                aria-invalid={Boolean(errors.phone)}
                required
                className="phone-number-input"
              />
            </div>
            {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
          </div>
        </div>

        {/* Service & Destination Row */}
        <div className="form-row">
          <div className={`form-group${errors.serviceInterest ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-service`}>
              Interested Service <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id={`${id}-service`}
              name="serviceInterest"
              value={form.serviceInterest}
              onChange={update('serviceInterest')}
              aria-invalid={Boolean(errors.serviceInterest)}
              required
            >
              <option value="">Select a service…</option>
              {serviceOptions.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.serviceInterest ? <span className="field-error">{errors.serviceInterest}</span> : null}
          </div>

          <div className={`form-group${errors.preferredDestination ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-destination`}>Preferred Destination</label>
            <select
              id={`${id}-destination`}
              name="preferredDestination"
              value={form.preferredDestination}
              onChange={update('preferredDestination')}
            >
              <option value="">Not decided yet</option>
              {destinationOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group"><label htmlFor={`${id}-status`}>Current class / status</label><select id={`${id}-status`} value={form.currentStatus} onChange={update('currentStatus')}><option value="">Choose your stage (optional)</option><option value="high_school">High school / Grade 9–12</option><option value="college">College / graduate</option><option value="working">Working professional</option></select></div>
          <div className="form-group"><label htmlFor={`${id}-degree`}>Target degree</label><select id={`${id}-degree`} value={form.targetDegree} onChange={update('targetDegree')}><option value="">Choose your goal (optional)</option><option value="ug">Undergraduate</option><option value="pg">Postgraduate</option><option value="mba">MBA / executive study</option><option value="undecided">Help me decide</option></select></div>
        </div>
        <div className="form-row">
          <div className={`form-group${errors.preferredDate ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-preferred-date`}>Preferred contact date (optional)</label>
            <input id={`${id}-preferred-date`} type="date" name="preferredDate" value={form.preferredDate} onChange={update('preferredDate')} min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} aria-invalid={Boolean(errors.preferredDate)} aria-describedby={errors.preferredDate ? `${id}-date-error` : undefined} />
            {errors.preferredDate ? <span className="field-error" id={`${id}-date-error`}>{errors.preferredDate}</span> : null}
          </div>
          <div className={`form-group${errors.preferredTime ? ' has-error' : ''}`}>
            <label htmlFor={`${id}-preferred-time`}>Preferred time (optional, IST)</label>
            <select id={`${id}-preferred-time`} name="preferredTime" value={form.preferredTime} onChange={update('preferredTime')} aria-invalid={Boolean(errors.preferredTime)}><option value="">Any suitable time</option>{['Morning (9am–12pm IST)', 'Afternoon (12pm–4pm IST)', 'Evening (4pm–7pm IST)'].map((time) => <option key={time}>{time}</option>)}</select>
            {errors.preferredTime ? <span className="field-error">{errors.preferredTime}</span> : null}
          </div>
        </div>
        {/* Message / Query */}
        <div className={`form-group${errors.message ? ' has-error' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor={`${id}-message`}>Your Study Goals & Questions (Optional)</label>
            <span className="char-counter">
              {form.message.length}/2000
            </span>
          </div>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={inModal ? 3 : 4}
            placeholder="Tell us about your target course, intake, preferred budget or exams taken..."
            value={form.message}
            onChange={update('message')}
            maxLength={2000}
          />
          {errors.message ? <span className="field-error">{errors.message}</span> : null}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting}
          style={{
            padding: '14px 20px',
            fontSize: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(11, 44, 95, 0.25)',
          }}
        >
          {submitting ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true" />
              <span>Sending Enquiry…</span>
            </>
          ) : (
            <>
              <i className="fas fa-calendar-check" aria-hidden="true" />
              <span>Book Free Counselling Session</span>
            </>
          )}
        </button>

        <p className="form-privacy-note" style={{ textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
          <i className="fas fa-shield-halved" style={{ marginRight: '4px', color: '#10b981' }} />
          Request free counselling. Our team will confirm availability with you.
        </p>
      </form>
    </div>
  )
}
