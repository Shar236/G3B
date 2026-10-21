import { Link } from 'react-router-dom'

/**
 * Section G: Partner With Us (Homepage invitation block)
 * Invites schools, career counsellors, and educational consultants to collaborate.
 */
export default function PartnerSection() {
  const partnerCategories = [
    {
      title: 'Schools & Institutions',
      icon: 'fas fa-school',
      description: 'Career guidance seminars, stream selection workshops & psychometric battery tests for students in Grades 9–12.',
    },
    {
      title: 'Career Counsellors & Mentors',
      icon: 'fas fa-user-tie',
      description: 'Collaborative overseas admissions support, test prep co-mentorship & shared student guidance resources.',
    },
    {
      title: 'Educational Consultants',
      icon: 'fas fa-handshake-angle',
      description: 'Structured referral collaboration with transparent communication, application processing & zero hidden biases.',
    },
    {
      title: 'Training & Skill Providers',
      icon: 'fas fa-chalkboard-user',
      description: 'IELTS/PTE language workshops, profile-building collaborations & international education awareness sessions.',
    },
  ]

  return (
    <section className="section" id="partner" style={{ background: '#ffffff', padding: '80px 0', borderTop: '1px solid #f1f5f9' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
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
            <i className="fas fa-handshake" aria-hidden="true" />
            <span>Institutional & Professional Collaboration</span>
          </div>

          <h2 className="section-title" style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)', marginBottom: '14px' }}>
            Partner With G3B Education
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Join G3B Education in helping students make informed decisions about their academic and international education journeys. Connect with us to explore meaningful, student-first collaboration opportunities.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {partnerCategories.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#0B2C5F',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  marginBottom: '18px',
                }}
              >
                <i className={item.icon} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2C5F', margin: '0 0 10px 0' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(230, 78, 21, 0.08) 0%, rgba(11, 44, 95, 0.05) 100%)',
            border: '1px solid rgba(230, 78, 21, 0.2)',
            borderRadius: '16px',
            padding: '32px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0B2C5F' }}>
              Interested in collaborating with G3B Education?
            </h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>
              Explore partner categories, collaboration benefits, and submit your partnership enquiry directly through our dedicated portal.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/partner-with-us"
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: 700 }}
            >
              <i className="fas fa-arrow-right" aria-hidden="true" /> Explore Partner Program
            </Link>
            <Link
              to="/partner-with-us#partner-form"
              className="btn btn-outline"
              style={{ padding: '12px 24px', fontWeight: 700 }}
            >
              <i className="fas fa-file-signature" aria-hidden="true" /> Submit Partner Enquiry
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
