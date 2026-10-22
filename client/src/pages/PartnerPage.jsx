import { useRef, useState } from 'react'
import api from '../api/client.js'
import usePageSeo from '../hooks/usePageSeo.js'
import '../styles/partner.css'

export default function PartnerPage() {
  const submitting = useRef(false)

  // SEO metadata
  usePageSeo('/partner-with-us', {
    title: 'Partner With G3B Education | Institutional & Educational Collaboration',
    description:
      'Join G3B Education in helping students make informed decisions about their academic and international education journeys. Connect with us to explore meaningful collaboration opportunities.',
    keywords:
      'education partnership, study abroad collaboration, school career counselling workshops, educational consultants, Navi Mumbai education partners',
  })

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    organizationName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    organizationType: '',
    location: '',
    websiteUrl: '',
    partnershipInterest: '',
    message: '',
    consent: false,
    hp_address: '', // Honeypot trap
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [statusMessage, setStatusMessage] = useState(null)
  const [submittedId, setSubmittedId] = useState(null)

  const partnerCategories = [
    {
      title: 'Educational Consultants',
      icon: 'fas fa-briefcase',
      tagline: 'Joint Application Advisory & Profile Mapping',
      description:
        'Collaborate on student admissions with complete transparency. We provide specialized psychometric profiling, test coaching (IELTS/PTE), and unbiased university matching with ethical collaboration terms.',
    },
    {
      title: 'Schools & Educational Institutions',
      icon: 'fas fa-school',
      tagline: 'High School Roadmaps & Career Seminars',
      description:
        'Partner with G3B to deliver structured career orientation seminars, stream selection guidance for Grade 9–12 students, and scientific psychometric battery assessments on campus or online.',
    },
    {
      title: 'Career Counsellors & Mentors',
      icon: 'fas fa-user-graduate',
      tagline: 'Coordinated Guidance & Overseas Specialization',
      description:
        'Broaden your students’ global opportunities by collaborating with our study abroad documentation desk, SOP specialists, and experienced visa interview coaches.',
    },
    {
      title: 'Student Recruitment Professionals',
      icon: 'fas fa-users-gear',
      tagline: 'Professional Communication & File Processing',
      description:
        'Work alongside experienced advisors who prioritize student suitability, academic prerequisites, and financial viability above all commercial interests.',
    },
    {
      title: 'Training & Educational Service Providers',
      icon: 'fas fa-chalkboard-user',
      tagline: 'Curriculum Synergies & Test Prep Workshops',
      description:
        'Deliver specialized language workshops, communication modules, and test prep masterclasses led by experienced language and admissions faculty.',
    },
    {
      title: 'Other Relevant Organizations',
      icon: 'fas fa-building-columns',
      tagline: 'Corporate, Community & NGO Synergies',
      description:
        'Explore tailored educational webinars, scholarship awareness campaigns, and international study guidance initiatives for your community members.',
    },
  ]

  const steps = [
    {
      number: '1',
      title: 'Submit Enquiry',
      desc: 'Complete the partnership form with your organization details, location, and collaboration focus.',
    },
    {
      number: '2',
      title: 'Information Review',
      desc: 'Our partnerships team assesses your inquiry and alignment with G3B Education’s student-first values.',
    },
    {
      number: '3',
      title: 'Direct Contact',
      desc: 'Our team contacts you by email or phone to discuss your collaboration ideas.',
    },
    {
      number: '4',
      title: 'Suitability Discussion',
      desc: 'Both parties explore collaboration scope, student guidance protocols, and mutual synergy.',
    },
    {
      number: '5',
      title: 'Partner Onboarding',
      desc: 'Approved partners receive official collaboration materials, guidance resources, and designated point of contact.',
    },
  ]

  const validateClient = () => {
    const errs = {}
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters.'
    }
    if (!formData.organizationName.trim() || formData.organizationName.trim().length < 2) {
      errs.organizationName = 'Organization name is required.'
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid work email address.'
    }
    if (!formData.phone.trim() || !/^[\d\s()+-]{7,20}$/.test(formData.phone.trim())) {
      errs.phone = 'Please provide a valid contact phone number.'
    }
    if (!formData.organizationType) {
      errs.organizationType = 'Please select your organization type.'
    }
    if (!formData.location.trim()) {
      errs.location = 'City or country is required.'
    }
    if (!formData.partnershipInterest) {
      errs.partnershipInterest = 'Please select your partnership interest.'
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please provide a message with at least 10 characters.'
    }
    if (!formData.consent) {
      errs.consent = 'You must agree to the privacy policy to submit your enquiry.'
    }
    return errs
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    const clientErrors = validateClient()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      const firstKey = Object.keys(clientErrors)[0]
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.focus()
      return
    }

    submitting.current = true
    setLoading(true)
    setStatusMessage(null)
    setErrors({})

    try {
      const response = await api.post('/api/partner-enquiries', formData)
      if (response.data?.success && response.data?.data?.id) {
        setStatusMessage({
          type: 'success',
          text:
            response.data.message ||
            'Thank you for your partnership enquiry! Our partnerships director will review your submission and connect with you shortly.',
        })
        setSubmittedId(response.data.data.id)
        setFormData({
          fullName: '',
          organizationName: '',
          email: '',
          countryCode: '+91',
          phone: '',
          organizationType: '',
          location: '',
          websiteUrl: '',
          partnershipInterest: '',
          message: '',
          consent: false,
          hp_address: '',
        })
      } else {
        throw new Error('Your enquiry could not be verified. Please try again or contact our team.')
      }
    } catch (err) {
      const backendDetails = err.response?.data?.details
      if (backendDetails) {
        setErrors(backendDetails)
      }
      setStatusMessage({
        type: 'error',
        text:
          err.response?.data?.error ||
          err.message || 'We encountered an issue submitting your partnership enquiry. Please check your details and try again.',
      })
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <div className="partner-page">
      {/* 1. Hero Section */}
      <section
        className="partner-hero"
        style={{
          background: 'linear-gradient(135deg, #071E42 0%, #0B2C5F 50%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: 'var(--section-space) 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '880px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(230, 78, 21, 0.2)',
              border: '1px solid rgba(230, 78, 21, 0.4)',
              color: '#ff8a50',
              padding: '6px 18px',
              borderRadius: '24px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '20px',
            }}
          >
            <i className="fas fa-handshake" aria-hidden="true" />
            <span>Collaboration & Partner Program</span>
          </div>

          <h1
            style={{
              color: '#ffffff',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '20px',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.02em',
            }}
          >
            Partner With G3B Education
          </h1>

          <p
            style={{
              fontSize: '1.18rem',
              lineHeight: 1.7,
              color: '#cbd5e1',
              marginBottom: '36px',
              maxWidth: '780px',
              margin: '0 auto 36px',
            }}
          >
            Join G3B Education in helping students make informed decisions about their academic and international education journeys. Connect with us to explore meaningful collaboration opportunities.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#partner-form"
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', fontWeight: 700 }}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <i className="fas fa-user-plus" aria-hidden="true" /> Become a Partner
            </a>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                borderColor: '#ffffff',
              }}
              onClick={() => {
                document.getElementById('partner-form')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
                document.getElementById('field-fullName')?.focus({ preventScroll: true })
              }}
            >
              <i className="fas fa-comments" aria-hidden="true" /> Discuss a Partnership
            </button>
          </div>
        </div>
      </section>

      {/* 2. Partnership Opportunities */}
      <section className="section" style={{ background: '#ffffff', padding: 'var(--section-space) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(11, 44, 95, 0.08)',
                color: '#0B2C5F',
                padding: '6px 16px',
                borderRadius: '24px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
              }}
            >
              <i className="fas fa-network-wired" aria-hidden="true" />
              <span>Potential Collaboration Categories</span>
            </div>

            <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)', marginBottom: '16px' }}>
              Partnership Opportunities
            </h2>

            <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              We collaborate with forward-thinking educators, institutions, and student guidance professionals across multiple disciplines to create ethical, high-impact guidance pathways.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '28px',
            }}
          >
            {partnerCategories.map((cat, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#0B2C5F',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.35rem',
                    marginBottom: '20px',
                  }}
                >
                  <i className={cat.icon} aria-hidden="true" />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B2C5F', margin: '0 0 6px 0' }}>
                  {cat.title}
                </h3>

                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e64e15', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                  {cat.tagline}
                </div>

                <p style={{ fontSize: '0.94rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Why Collaborate With G3B */}
      <section className="section section-alt" style={{ background: '#f1f5f9', padding: 'var(--section-space) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
            <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)', marginBottom: '16px' }}>
              Why Collaborate With G3B Education?
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Our partnership principles are grounded in authenticity, professional communication, and genuine student advocacy.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '24px',
            }}
          >
            <div style={{ background: '#ffffff', padding: '28px 24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#0B2C5F', fontSize: '1.5rem', marginBottom: '14px' }}>
                <i className="fas fa-bullseye" aria-hidden="true" />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '10px' }}>
                Coordinated Student Guidance
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                Every student receives structured advice matching their specific academic standing, career inclinations, and financial plans.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '28px 24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#e64e15', fontSize: '1.5rem', marginBottom: '14px' }}>
                <i className="fas fa-hand-holding-heart" aria-hidden="true" />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '10px' }}>
                Zero Commercial Bias
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                We do not push unsuitable institutions. We present verified admission requirements and objective facts so families make informed choices.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '28px 24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#059669', fontSize: '1.5rem', marginBottom: '14px' }}>
                <i className="fas fa-comments" aria-hidden="true" />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '10px' }}>
                Professional Communication
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                Transparent progress updates, designated partner coordinators, and clear protocols ensure seamless student handovers.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '28px 24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#2563eb', fontSize: '1.5rem', marginBottom: '14px' }}>
                <i className="fas fa-certificate" aria-hidden="true" />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '10px' }}>
                Verified Credentials
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                Guidance led by senior career mentors, certified psychometricians, and admissions advisors with over 15 years of proven industry experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How Partnership Works */}
      <section className="section" style={{ background: '#ffffff', padding: 'var(--section-space) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
            <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)', marginBottom: '16px' }}>
              How Partnership Works
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              A transparent, 5-step collaborative process designed for mutual synergy and student success.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '20px',
            }}
          >
            {steps.map((st) => (
              <div
                key={st.number}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#0B2C5F',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                  }}
                >
                  {st.number}
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0B2C5F', margin: '0 0 8px 0' }}>
                  {st.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Partner Enquiry Form */}
      <section
        className="section"
        id="partner-form"
        style={{
          background: '#f8fafc',
          padding: 'var(--section-space) 0',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="container" style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(230, 78, 21, 0.1)',
                color: '#e64e15',
                padding: '6px 16px',
                borderRadius: '24px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
              }}
            >
              <i className="fas fa-file-signature" aria-hidden="true" />
              <span>Direct Collaboration Portal</span>
            </div>

            <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)', marginBottom: '14px' }}>
              Submit a Partnership Enquiry
            </h2>

            <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
              Fill in your organization details below. Our partnerships team will review your information and get in touch to discuss potential collaboration.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: '0 15px 35px -5px rgba(11,44,95,0.08)',
            }}
          >
            {statusMessage ? (
              <div
                role="alert"
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
                }}
              >
                <i
                  className={statusMessage.type === 'success' ? 'fas fa-circle-check' : 'fas fa-triangle-exclamation'}
                  style={{ fontSize: '1.2rem', marginTop: '2px' }}
                  aria-hidden="true"
                />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                    {statusMessage.type === 'success' ? 'Enquiry Successfully Received' : 'Submission Error'}
                  </div>
                  <div style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>{statusMessage.text}</div>
                  {submittedId ? (
                    <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#047857' }}>
                      Reference ID: <strong>#{submittedId}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate>
              {/* Spam honeypot trap (invisible to human users) */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="hp_address">Leave this field blank</label>
                <input
                  type="text"
                  id="hp_address"
                  name="hp_address"
                  value={formData.hp_address}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Full Name */}
                <div>
                  <label htmlFor="field-fullName" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="field-fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.fullName)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.fullName ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  {errors.fullName ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.fullName}
                    </span>
                  ) : null}
                </div>

                {/* Organization Name */}
                <div>
                  <label htmlFor="field-organizationName" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Organization / School Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="field-organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g. Apex International School"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.organizationName)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.organizationName ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  {errors.organizationName ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.organizationName}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Work Email */}
                <div>
                  <label htmlFor="field-email" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Work Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    id="field-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@organization.com"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.email)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.email ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  {errors.email ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.email}
                    </span>
                  ) : null}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="field-phone" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Phone Number with Country Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      placeholder="+91"
                      style={{
                        width: '75px',
                        padding: '11px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        textAlign: 'center',
                        fontFamily: 'inherit',
                      }}
                      aria-label="Country Dial Code"
                    />
                    <input
                      type="tel"
                      id="field-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="98200 00000"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errors.phone)}
                      style={{
                        flex: 1,
                        padding: '11px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${errors.phone ? '#ef4444' : '#cbd5e1'}`,
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.phone ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.phone}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Organization Type */}
                <div>
                  <label htmlFor="field-organizationType" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Organization Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id="field-organizationType"
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.organizationType)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.organizationType ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      background: '#ffffff',
                    }}
                  >
                    <option value="">Select organization category...</option>
                    <option value="Educational Consultant">Educational Consultant / Agency</option>
                    <option value="School / Educational Institution">School / Educational Institution</option>
                    <option value="Career Counsellor">Career Counsellor / Independent Mentor</option>
                    <option value="Student Recruitment Professional">Student Recruitment & Guidance Professional</option>
                    <option value="Training / Educational Service Provider">Training / Educational Service Provider</option>
                    <option value="Other">Other Organization</option>
                  </select>
                  {errors.organizationType ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.organizationType}
                    </span>
                  ) : null}
                </div>

                {/* Country or City */}
                <div>
                  <label htmlFor="field-location" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Country or City <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="field-location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Navi Mumbai, India"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.location)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.location ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  {errors.location ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.location}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Website URL (optional) */}
                <div>
                  <label htmlFor="field-websiteUrl" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Website URL <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="url"
                    id="field-websiteUrl"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Partnership Interest */}
                <div>
                  <label htmlFor="field-partnershipInterest" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                    Primary Partnership Interest <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id="field-partnershipInterest"
                    name="partnershipInterest"
                    value={formData.partnershipInterest}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errors.partnershipInterest)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.partnershipInterest ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      background: '#ffffff',
                    }}
                  >
                    <option value="">Select primary collaboration focus...</option>
                    <option value="School Career Guidance Workshops">School Career Guidance Workshops & Seminars</option>
                    <option value="Psychometric Assessment Partnership">Psychometric Battery Test Collaborations</option>
                    <option value="Student Admissions Referral">Student Admissions & Profile Shortlisting Referral</option>
                    <option value="IELTS / Test Prep Synergy">Test Preparation (IELTS/PTE) Training Support</option>
                    <option value="Visa & Documentation Support">Overseas Documentation & Visa Interview Mock Sessions</option>
                    <option value="General Strategic Collaboration">General Strategic Educational Collaboration</option>
                  </select>
                  {errors.partnershipInterest ? (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                      {errors.partnershipInterest}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="field-message" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '6px' }}>
                  Collaboration Message / Goals <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  id="field-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about your organization, current student demographic, and how you would like to collaborate with G3B Education..."
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.message)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.message ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                {errors.message ? (
                  <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                    {errors.message}
                  </span>
                ) : null}
              </div>

              {/* Consent Checkbox */}
              <div style={{ marginBottom: '28px' }}>
                <label htmlFor="field-consent" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="field-consent"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    required
                    style={{ marginTop: '3px', cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                    I consent to the G3B Education team contacting me regarding this partnership enquiry.
                  </span>
                </label>
                {errors.consent ? (
                  <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                    {errors.consent}
                  </span>
                ) : null}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                    <span>Submitting Enquiry...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane" aria-hidden="true" />
                    <span>Submit Partnership Enquiry</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
