import { resolveMediaUrl } from '../api/client.js'

/**
 * "Why choose G3B Education" section with the founder profile badge, credentials text,
 * and the dynamic certification grid with full-size preview links.
 */
export default function About({ content = {}, settings = {}, features = [], certifications = [] }) {
  const founderName = settings.founder_name || 'Minal Kulkarni'
  const founderRole = settings.founder_role || 'Founder, G3B Education'
  const credentialsText = settings.founder_credentials_text || 'TESOL Certified Master Trainer · 15+ Years Guiding Global Aspirants'
  const paragraphs = (content.why?.body || '').split('\n').filter((line) => line.trim().length > 0)

  return (
    <section className="section" id="why">
      <div className="container">
        <div className="why-choose">
          <div className="why-content">
            <h2 className="section-title">{content.why?.heading || 'Why Choose G3B Education?'}</h2>

            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

            {features.length > 0 ? (
              <div className="why-features">
                {features.map((feature) => (
                  <div className="feature-item" key={feature.id}>
                    <i className={feature.icon || 'fas fa-check'} aria-hidden="true" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="why-image-wrap">
            {settings.founder_image_url ? (
              <div className="why-image">
                <img
                  src={resolveMediaUrl(settings.founder_image_url)}
                  alt={settings.founder_image_alt || founderName}
                  loading="lazy"
                  decoding="async"
                  width="400"
                  height="450"
                  style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                />
                <div className="why-image-badge">
                  <strong>{founderName}</strong>
                  <span>{founderRole}</span>
                  <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px', fontWeight: 600 }}>
                    {credentialsText}
                  </div>
                </div>
              </div>
            ) : null}

            {certifications.length > 0 ? (
              <div className="certs-block">
                <h4>
                  <i className="fas fa-certificate" aria-hidden="true" />
                  {settings.certifications_heading || 'Certifications & Credentials'}
                </h4>
                <div className="certs-grid">
                  {certifications.map((certification) => (
                    <a
                      key={certification.id}
                      className="cert-item"
                      href={resolveMediaUrl(certification.fullUrl || certification.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={certification.altText}
                    >
                      <img
                        src={resolveMediaUrl(certification.imageUrl)}
                        alt={certification.altText}
                        loading="lazy"
                        decoding="async"
                        width="120"
                        height="80"
                        style={{ objectFit: 'contain' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
