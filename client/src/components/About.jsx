import { resolveMediaUrl } from '../api/client.js'

/**
 * Section B: "Why Choose G3B Education" & Team/Founder Profile
 * Features authentic credentials (15+ years guiding students, lead consultant),
 * improved responsive image handling, clear value proposition, and no unapproved claims.
 */
export default function About({ content = {}, settings = {}, features = [] }) {
  const founderName = settings.founder_name || 'Minal Kulkarni'
  const founderRole = settings.founder_role || 'Founder & Chief Career Mentor'
  const credentialsText = settings.founder_credentials_text || 'Lead Career Consultant & Founder · 15+ Years Guiding Global Aspirants'
  const paragraphs = (content.why?.body || '').split('\n').filter((line) => line.trim().length > 0)

  const defaultParagraphs = [
    'At G3B Education, we empower students to unlock their authentic potential through personalized career guidance, scientific psychometric assessment, and structured overseas education roadmaps.',
    'With more than 15 years of mentoring experience, we believe every student deserves honest, transparent, and student-first advice. Whether choosing subjects in high school or applying for competitive Master’s degrees abroad, our certified counsellors guide you with complete clarity.',
  ]

  const displayParagraphs = paragraphs.length > 0 ? paragraphs : defaultParagraphs

  return (
    <section className="section" id="why">
      <div className="container">
        <div className="why-choose" id="team">
          <div className="why-content">
            <div className="section-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent, #e64e15)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              <i className="fas fa-shield-halved" aria-hidden="true" />
              <span>Authentic & Transparent Guidance</span>
            </div>

            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '16px' }}>
              {content.why?.heading || 'Why Choose G3B Education?'}
            </h2>

            {displayParagraphs.map((paragraph, index) => (
              <p key={index} style={{ fontSize: '1.02rem', lineHeight: '1.7', color: 'var(--color-text, #334155)', marginBottom: '16px' }}>
                {paragraph}
              </p>
            ))}

            {features.length > 0 ? (
              <div className="why-features" style={{ marginTop: '24px' }}>
                {features.map((feature) => (
                  <div className="feature-item" key={feature.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(230, 78, 21, 0.1)', color: '#e64e15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <i className={feature.icon || 'fas fa-check'} style={{ fontSize: '13px' }} aria-hidden="true" />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-dark, #0B2C5F)', fontSize: '0.96rem' }}>{feature.text}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="why-credentials-strip" style={{ marginTop: '28px', padding: '16px 20px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-award" style={{ color: '#0B2C5F', fontSize: '1.2rem' }} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B2C5F' }}>15+ Years Mentoring</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Guiding Global Aspirants</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-brain" style={{ color: '#e64e15', fontSize: '1.2rem' }} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B2C5F' }}>Psychometric Profiling</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Certified Practitioners</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-hand-holding-heart" style={{ color: '#059669', fontSize: '1.2rem' }} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B2C5F' }}>Zero Commercial Bias</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>100% Student-First Advice</div>
                </div>
              </div>
            </div>
          </div>

          <div className="why-image-wrap">
            <div className="why-image" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(11,44,95,0.2)' }}>
              <img
                src={settings.founder_image_url ? resolveMediaUrl(settings.founder_image_url) : 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800'}
                alt={settings.founder_image_alt || founderName}
                loading="lazy"
                decoding="async"
                width="400"
                height="480"
                style={{ width: '100%', height: '440px', objectFit: 'cover', display: 'block' }}
              />
              <div
                className="why-image-badge"
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(11, 44, 95, 0.94)',
                  backdropFilter: 'blur(8px)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{founderName}</div>
                <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600, marginTop: '2px' }}>{founderRole}</div>
                <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-award" aria-hidden="true" />
                  <span>{credentialsText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
