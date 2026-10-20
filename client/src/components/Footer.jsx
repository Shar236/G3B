import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import defaultHomeData from '../data/defaultHomeContent.js'

/** Site footer: brand summary, quick links, contact details and social profiles. */
export default function Footer({ settings = {}, content = {}, socialLinks = [], services = [], destinations = [] }) {
  const activeSettings = { ...defaultHomeData.settings, ...settings }
  const brand = activeSettings.brand_name || 'G3B Education'
  const logoUrl = activeSettings.header_logo_url ? resolveMediaUrl(activeSettings.header_logo_url) : '/logo.png'
  const tagline = content.footer?.body || defaultHomeData.content?.footer?.body || 'Career Guidance · Psychometric Assessment · Study Abroad'
  const year = new Date().getFullYear()

  const activeDestinations = (destinations && destinations.length > 0) ? destinations : defaultHomeData.destinations
  const activeServices = (services && services.length > 0) ? services : defaultHomeData.services
  const activeSocialLinks = (socialLinks && socialLinks.length > 0) ? socialLinks : (defaultHomeData.socialLinks && defaultHomeData.socialLinks.length > 0 ? defaultHomeData.socialLinks : [
    { id: 'wa', platform: 'WhatsApp', url: 'https://wa.me/919820000000', icon: 'fab fa-whatsapp' },
    { id: 'li', platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'fab fa-linkedin-in' },
    { id: 'ig', platform: 'Instagram', url: 'https://instagram.com', icon: 'fab fa-instagram' },
  ])

  return (
    <footer className="g3b-site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-brand">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brand}
                  className="footer-logo-img"
                />
              ) : (
                <span className="brand-mark" aria-hidden="true">
                  <i className="fas fa-graduation-cap" />
                </span>
              )}
              {brand}
            </div>
            <p className="footer-about">
              {activeSettings.seo_description ||
                'Career guidance, psychometric assessment, test preparation and end-to-end study abroad support from Nerul, Navi Mumbai.'}
            </p>
            {activeSocialLinks.length > 0 ? (
              <div className="footer-social">
                {activeSocialLinks.map((link) => (
                  <a
                    key={link.id || link.platform}
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
              <li><Link to="/#pathways">Grade 9+ & Career Pathways</Link></li>
              <li><Link to="/#knowledge-hub">Free Guide & Newsletter</Link></li>
              <li><Link to="/insights">Study Abroad Insights</Link></li>
              {activeServices.slice(0, 6).map((service) => (
                <li key={service.id || service.title}>
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
              {activeDestinations.slice(0, 6).map((destination) => (
                <li key={destination.id || destination.country}>
                  <Link to="/#destinations">{destination.country}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Get in Touch</h4>
            <ul>
              {activeSettings.contact_address ? (
                <li>
                  <p>{activeSettings.contact_address}</p>
                </li>
              ) : null}
              {activeSettings.contact_phone ? (
                <li>
                  <a href={`tel:${activeSettings.contact_phone_link || activeSettings.contact_phone}`}>{activeSettings.contact_phone}</a>
                </li>
              ) : null}
              {activeSettings.contact_email ? (
                <li>
                  <a href={`mailto:${activeSettings.contact_email}`}>{activeSettings.contact_email}</a>
                </li>
              ) : null}
              {activeSettings.working_hours ? (
                <li>
                  <p>{activeSettings.working_hours}</p>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            {activeSettings.footer_copyright || `© ${year} ${brand}. All rights reserved.`}
          </p>
          <p>{tagline}</p>
        </div>
      </div>
    </footer>
  )
}
