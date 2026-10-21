import { resolveMediaUrl } from '../api/client.js'

const DEFAULT_CERTIFICATIONS = [
  {
    id: 1,
    altText: 'UCLA Extension Global Career Counselling Certification',
    imageUrl: 'https://images.pexels.com/photos/39296651/pexels-photo-39296651.png?auto=compress&cs=tinysrgb&w=400',
    fullUrl: 'https://images.pexels.com/photos/39296651/pexels-photo-39296651.png',
  },
  {
    id: 2,
    altText: 'Certified Career Counselling Professional',
    imageUrl: 'https://images.pexels.com/photos/39296579/pexels-photo-39296579.png?auto=compress&cs=tinysrgb&w=400',
    fullUrl: 'https://images.pexels.com/photos/39296579/pexels-photo-39296579.png',
  },
  {
    id: 3,
    altText: 'Professional Education Guidance Certification',
    imageUrl: 'https://images.pexels.com/photos/39296552/pexels-photo-39296552.jpeg?auto=compress&cs=tinysrgb&w=400',
    fullUrl: 'https://images.pexels.com/photos/39296552/pexels-photo-39296552.jpeg',
  },
]

/**
 * Section B: "Why Choose G3B Education" & Team/Founder Profile
 * Features authentic credentials and certifications, clean founder profile without unapproved claims.
 */
export default function About({ content = {}, settings = {}, features = [], certifications = [] }) {
  const founderName = settings.founder_name || 'Minal Kulkarni'
  const founderRole = settings.founder_role || 'Founder, G3B Education'
  const paragraphs = (content.why?.body || '').split('\n').filter((line) => line.trim().length > 0)

  const defaultParagraphs = [
    'At G3B Education, we empower students to unlock their full potential through transformative international education experiences. Our core strength is career guidance backed by scientific psychometric assessment, combined with expert advisors, personalized counselling, and a global network of top-tier universities — so you choose the right course and country with clarity.',
    'Our student-centric approach, unparalleled support services, and proven track record of success set us apart. By choosing G3B Education, you’ll gain access to a world of academic and professional opportunities, and join a community of like-minded individuals who share your passion for global learning and growth.',
  ]

  const displayParagraphs = paragraphs.length > 0 ? paragraphs : defaultParagraphs
  const certsToDisplay = certifications && certifications.length > 0 ? certifications : DEFAULT_CERTIFICATIONS

  return (
    <section className="section" id="why">
      <div className="container">
        <div className="why-choose" id="team">
          <div className="why-content">
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '16px' }}>
              {content.why?.heading || 'Why Choose G3B Education?'}
            </h2>

            {displayParagraphs.map((paragraph, index) => (
              <p key={index} style={{ fontSize: '1.02rem', lineHeight: '1.7', color: 'var(--color-text, #334155)', marginBottom: '16px' }}>
                {paragraph}
              </p>
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
            <div className="why-image">
              <img
                src={settings.founder_image_url ? resolveMediaUrl(settings.founder_image_url) : 'https://images.pexels.com/photos/39014435/pexels-photo-39014435.jpeg?auto=compress&cs=tinysrgb&w=900'}
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
              </div>
            </div>

            {certsToDisplay && certsToDisplay.length > 0 ? (
              <div className="certs-block">
                <h4>
                  <i className="fas fa-certificate" aria-hidden="true" />
                  {settings.certifications_heading || 'Certifications & Credentials'}
                </h4>
                <div className="certs-grid">
                  {certsToDisplay.map((certification) => (
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
