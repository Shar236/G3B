import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Section C: Our Approach
 * A three-stage framework (Discover, Plan, Progress) with concise, keyword-focused
 * deliverables and crisp summaries.
 */
export default function Approach({ content = {}, steps }) {
  const { openModal } = useCounsellingModal()

  const defaultStages = [
    {
      number: '01',
      title: 'Discover',
      tagline: 'Aptitude & Career Profiling',
      icon: 'fas fa-compass',
      color: '#0B2C5F',
      accent: '#2563eb',
      description:
        'Identify genuine strengths, career inclinations, and academic potential through scientific evaluation.',
      highlights: [
        'Psychometric Assessment',
        'Strengths & Aptitude Mapping',
        'Grade 9–12 Stream Selection',
        '1-on-1 Profile Evaluation',
      ],
      badge: 'Step 1: Self-Awareness',
    },
    {
      number: '02',
      title: 'Plan',
      tagline: 'Course, Country & Budget',
      icon: 'fas fa-map-location-dot',
      color: '#0f172a',
      accent: '#e64e15',
      description:
        'Targeted shortlisting of global universities, test timelines, and scholarship budgets.',
      highlights: [
        'University Shortlisting (Dream / Target / Safe)',
        'Tuition & Living Expense Planning',
        'IELTS / TOEFL / GRE Test Plan',
        'Scholarships & Financial Aid',
      ],
      badge: 'Step 2: Strategic Roadmap',
    },
    {
      number: '03',
      title: 'Progress',
      tagline: 'Applications & Visa Success',
      icon: 'fas fa-paper-plane',
      color: '#0B2C5F',
      accent: '#059669',
      description:
        'Flawless execution from SOP and document audits to mock visa interviews and pre-departure.',
      highlights: [
        'SOP, Essays & Resume Mentoring',
        'Application Filing & Document Review',
        'Embassy Visa Mock Interviews',
        'Pre-Departure & Forex Support',
      ],
      badge: 'Step 3: Flawless Execution',
    },
  ]
  const stages = Array.isArray(steps) && steps.length ? steps.map((step, index) => ({
    number: String(step.stepNumber || index + 1).padStart(2, '0'), title: step.title,
    description: step.description, icon: step.icon || 'fas fa-compass',
    accent: ['#2563eb', '#e64e15', '#059669'][index % 3], color: '#0B2C5F',
    badge: `Step ${step.stepNumber || index + 1}`, tagline: '', highlights: [],
  })) : defaultStages

  return (
    <section className="section" id="approach" style={{ background: '#f8fafc', padding: '80px 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 48px' }}>
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
            <i className="fas fa-route" aria-hidden="true" />
            <span>Structured Student Journey</span>
          </div>

          <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)', marginBottom: '14px' }}>
            {content.process?.heading || `Our ${stages.length}-step mentoring approach`}
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            {content.process?.subheading || 'A structured journey from understanding your strengths to preparing your next step.'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '28px',
            marginBottom: '40px',
          }}
        >
          {stages.map((stage) => (
            <div
              key={stage.number}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '32px 26px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: '0 10px 25px -5px rgba(11,44,95,0.05)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '14px',
                    background: `${stage.accent}15`,
                    color: stage.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.35rem',
                  }}
                >
                  <i className={stage.icon} aria-hidden="true" />
                </div>
                <span
                  style={{
                    fontSize: '1.9rem',
                    fontWeight: 900,
                    color: '#e2e8f0',
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {stage.number}
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: stage.accent,
                  marginBottom: '6px',
                }}
              >
                {stage.badge}
              </div>

              <h3
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#0B2C5F',
                  margin: '0 0 4px 0',
                }}
              >
                {stage.title}
              </h3>

              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '12px',
                }}
              >
                {stage.tagline}
              </div>

              <p
                style={{
                  fontSize: '0.92rem',
                  color: '#64748b',
                  lineHeight: 1.55,
                  marginBottom: '20px',
                }}
              >
                {stage.description}
              </p>

              {stage.highlights.length > 0 ? <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0B2C5F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Core Focus & Deliverables:
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {stage.highlights.map((h, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '0.88rem',
                        color: '#1e293b',
                        fontWeight: 500,
                        marginBottom: '8px',
                        lineHeight: 1.4,
                      }}
                    >
                      <i className="fas fa-check" style={{ color: stage.accent, fontSize: '11px', marginTop: '3px', flexShrink: 0 }} aria-hidden="true" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div> : null}
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #0B2C5F 0%, #1e3a8a 100%)',
            borderRadius: '16px',
            padding: '30px 36px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: '0 20px 40px -15px rgba(11,44,95,0.3)',
          }}
        >
          <div>
            <h3 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800 }}>
              Ready to start your personalized education roadmap?
            </h3>
            <p style={{ color: '#bfdbfe', margin: 0, fontSize: '0.95rem' }}>
              Book an initial 1-on-1 discovery consultation with our certified career counsellors in Nerul, Navi Mumbai.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openModal()}
            style={{ whiteSpace: 'nowrap', padding: '12px 24px', fontWeight: 700 }}
          >
            <i className="fas fa-paper-plane" aria-hidden="true" /> Book Free Counselling
          </button>
        </div>
      </div>
    </section>
  )
}
