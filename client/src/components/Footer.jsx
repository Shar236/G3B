import { Link } from 'react-router-dom'

/** Site footer: brand summary, quick links, contact details and social profiles. */
export default function Footer({ settings = {}, content = {}, socialLinks = [], services = [], destinations = [] }) {
  const brand = settings.brand_name || 'G3B Education'
  const tagline = content.footer?.body || 'Career Guidance · Psychometric Assessment · Study Abroad'
  const year = new Date().getFullYear()

  return (
    <footer className="g3b-site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-brand">
              <span className="brand-mark" aria-hidden="true">
                <i className="fas fa-graduation-cap" />
              </span>
              {brand}
            </div>
            <p className="footer-about">
              {settings.seo_description ||
                'Career guidance, psychometric assessment, test preparation and end-to-end study abroad support from Nerul, Navi Mumbai.'}
            </p>
            {socialLinks.length > 0 ? (
              <div className="footer-social">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    title={link.platform}
                  >
                    <i className={link.icon || 'fas fa-link'} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="footer-col">
            <h4>Our Services</h4>
            <ul>
              {services.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <Link to={`/services#${service.slug || service.id}`}>{service.title}</Link>
                </li>
              ))}
              <li>
                <Link to="/services" style={{ fontWeight: 600, color: 'var(--color-primary-light, #3b82f6)' }}>
                  View All Services &rarr;
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Study Destinations</h4>
            <ul>
              {destinations.slice(0, 6).map((destination) => (
                <li key={destination.id}>
                  <Link to="/#destinations">{destination.country}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Get in Touch</h4>
            <ul>
              {settings.contact_address ? (
                <li>
                  <p>{settings.contact_address}</p>
                </li>
              ) : null}
              {settings.contact_phone ? (
                <li>
                  <a href={`tel:${settings.contact_phone_link || settings.contact_phone}`}>{settings.contact_phone}</a>
                </li>
              ) : null}
              {settings.contact_email ? (
                <li>
                  <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                </li>
              ) : null}
              {settings.working_hours ? (
                <li>
                  <p>{settings.working_hours}</p>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            {settings.footer_copyright || `© ${year} ${brand}. All rights reserved.`}
          </p>
          <p>{tagline}</p>
        </div>
      </div>
    </footer>
  )
}
