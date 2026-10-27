import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Section H: Frequently Asked Questions (Accessible Accordion)
 * Covers career counselling, study abroad planning, scholarships, and visa guidance.
 */
export default function FaqSection({ content = {}, items }) {
  const { openModal } = useCounsellingModal()
  const [openIndex, setOpenIndex] = useState(0)

  const defaultFaqs = [
    {
      question: 'When is the best time to start planning for study abroad?',
      category: 'Planning & Roadmap',
      answer:
        'We recommend starting in Grade 11 or 12 for undergraduate studies, or at least 10–12 months prior to the target intake for Master’s programs. This allows sufficient time for standardized tests (IELTS/GRE/TOEFL), building an authentic extracurricular profile, multi-round SOP drafting, and timely scholarship applications.',
    },
    {
      question: 'What is the Psychometric Assessment and how does it help students?',
      category: 'Career Counselling',
      answer:
        'The G3B Psychometric Assessment is a scientifically structured evaluation that analyzes your cognitive aptitudes, dominant personality traits, and genuine interest areas. It produces an extensive analytical report followed by a 1-on-1 debriefing session with Minal Kulkarni to align stream selection and future career clusters before investing in university applications.',
    },
    {
      question: 'Can students secure scholarships or financial aid for studying abroad?',
      category: 'Scholarships & Funding',
      answer:
        'Scholarships and financial aid depend on the institution, award and applicant. Check the funding provider’s current eligibility rules, deadlines and award amount, and plan how you would cover the remaining cost. We help you research opportunities and organise an accurate application; awards are not guaranteed.',
    },
    {
      question: 'How does G3B Education support the student visa application process?',
      category: 'Visa Support',
      answer:
        'Our documentation mentors conduct a thorough checklist audit of academic transcripts, financial affidavits, and bank sponsor letters. We then simulate realistic embassy mock interview rounds with customized questions, ensuring students present their academic intentions and financial readiness with confidence.',
    },
    {
      question: 'Which study abroad destinations do you specialize in?',
      category: 'Destinations',
      answer:
        'We provide comprehensive admissions and visa guidance for the United States, United Kingdom, Canada, Australia, Germany, Ireland, and France. We help students evaluate post-study work rights (such as STEM OPT in the USA or Graduate Route in the UK) to select the right country for their long-term goals.',
    },
    {
      question: 'How do I book an initial counselling session with G3B Education?',
      category: 'Getting Started',
      answer:
        'You can click the "Free Counselling" button anywhere on our website, submit the contact form with your current grade and preferred destination, or visit our office at Nerul, Navi Mumbai. Our senior mentors will connect with you for a personalized discovery discussion.',
    },
  ]
  const faqs = Array.isArray(items) && items.length ? items : defaultFaqs

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx)
  }

  return (
    <section className="section" id="faqs" style={{ background: '#f8fafc', padding: '80px 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 48px' }}>
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
            <i className="fas fa-circle-question" aria-hidden="true" />
            <span>Got Questions? We Have Answers</span>
          </div>

          <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)', marginBottom: '14px' }}>
            {content.faqs?.heading || 'Frequently Asked Questions'}
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            {content.faqs?.subheading || 'Find clear answers to common questions about career guidance, overseas university applications, test preparation, and student visas.'}
          </p>
        </div>

        <div style={{ maxWidth: '840px', margin: '0 auto 40px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  marginBottom: '14px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  boxShadow: isOpen ? '0 8px 20px -4px rgba(11,44,95,0.08)' : 'none',
                  borderColor: isOpen ? '#93c5fd' : '#e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-btn-${idx}`}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {faq.category}
                    </span>
                    <span
                      style={{
                        fontSize: '1.02rem',
                        fontWeight: 700,
                        color: isOpen ? '#0B2C5F' : '#1e293b',
                        lineHeight: 1.45,
                      }}
                    >
                      {faq.question}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isOpen ? '#0B2C5F' : '#f1f5f9',
                      color: isOpen ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.2s ease, background-color 0.2s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    <i className="fas fa-chevron-down" style={{ fontSize: '12px' }} aria-hidden="true" />
                  </div>
                </button>

                  <div
                    hidden={!isOpen}
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-btn-${idx}`}
                    style={{
                      padding: '0 24px 22px 24px',
                      fontSize: '0.96rem',
                      color: '#475569',
                      lineHeight: 1.65,
                      borderTop: '1px solid #f8fafc',
                    }}
                  >
                    {faq.answer}
                  </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Have a question specific to your academic profile?
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => openModal()}
          >
            <i className="fas fa-comments" aria-hidden="true" /> Ask a Counsellor
          </button>
          <Link to="/insights" className="btn btn-ghost btn-sm">
            Read Study Abroad Articles &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}
