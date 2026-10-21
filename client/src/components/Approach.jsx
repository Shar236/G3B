import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Section C: Our Approach
 * A three-stage framework (Discover, Plan, Progress) inspired by KNG Lifegyaan,
 * tailored authentically to G3B Education's verified services.
 */
export default function Approach() {
  const { openModal } = useCounsellingModal()

  const stages = [
    {
      number: '01',
      title: 'Discover',
      tagline: 'Understand Self, Aptitude & Aspirations',
      icon: 'fas fa-compass',
      color: '#0B2C5F',
      accent: '#2563eb',
      description:
        'Every successful educational path starts with clarity. Through scientific psychometric mapping and personalized 1-on-1 discovery sessions, we identify your genuine strengths, cognitive inclinations, and long-term ambitions.',
      highlights: [
        'Scientific psychometric aptitude & personality assessment',
        'Academic profile & extracurricular audit',
        'In-depth student & parent debriefing consultation',
        'Early stream & subject selection for Grades 9–12',
      ],
      badge: 'Step 1: Self-Awareness',
    },
    {
      number: '02',
      title: 'Plan',
      tagline: 'Strategic Course, Country & Budget Mapping',
      icon: 'fas fa-map-location-dot',
      color: '#0f172a',
      accent: '#e64e15',
      description:
        'With your strengths defined, we map global options without bias. We evaluate course curriculums, living costs, post-study work rights, and realistic admission benchmarks to craft your custom roadmap.',
      highlights: [
        'Balanced university shortlisting (Dream, Target & Safe)',
        'Tuition budget, return on investment & living expense planning',
        'Standardized test roadmap (IELTS / TOEFL / PTE / GRE)',
        'Institutional grant & merit scholarship advisory',
      ],
      badge: 'Step 2: Strategic Roadmap',
    },
    {
      number: '03',
      title: 'Progress',
      tagline: 'Application Mastery, Visa Filing & Pre-Departure',
      icon: 'fas fa-paper-plane',
      color: '#0B2C5F',
      accent: '#059669',
      description:
        'Execution matters. We mentor every draft of your Statement of Purpose (SOP), coordinate official submissions, conduct realistic embassy mock interviews, and organize comprehensive pre-departure briefings.',
      highlights: [
        'High-impact SOP, essay & academic resume mentoring',
        'Complete university application filing & document audits',
        'Realistic Embassy mock interviews & visa file preparation',
        'Accommodation, foreign exchange & pre-departure orientations',
      ],
      badge: 'Step 3: Flawless Execution',
    },
  ]

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
            Our 3-Stage Mentoring Approach
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Inspired by proven educational frameworks, G3B Education guides students through a structured three-step journey — from discovering innate strengths to landing on your dream international campus.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: '0 10px 25px -5px rgba(11,44,95,0.05)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: `${stage.accent}15`,
                    color: stage.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  <i className={stage.icon} aria-hidden="true" />
                </div>
                <span
                  style={{
                    fontSize: '2rem',
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
                  fontSize: '0.75rem',
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
                  margin: '0 0 6px 0',
                }}
              >
                {stage.title}
              </h3>

              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '16px',
                }}
              >
                {stage.tagline}
              </div>

              <p
                style={{
                  fontSize: '0.94rem',
                  color: '#64748b',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}
              >
                {stage.description}
              </p>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0B2C5F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Key Deliverables:
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {stage.highlights.map((h, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '0.86rem',
                        color: '#334155',
                        marginBottom: '8px',
                        lineHeight: 1.45,
                      }}
                    >
                      <i className="fas fa-check" style={{ color: stage.accent, fontSize: '11px', marginTop: '3px', flexShrink: 0 }} aria-hidden="true" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #0B2C5F 0%, #1e3a8a 100%)',
            borderRadius: '16px',
            padding: '32px 36px',
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
