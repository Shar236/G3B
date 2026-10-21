import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import defaultHomeData from '../data/defaultHomeContent.js'

/**
 * Site footer reorganized into 4 clear groups inspired by the reference site:
 * Company, Services, Resources, Collaboration, alongside verified contact details.
 */
export default function Footer({
  settings = {},
  content = {},
  socialLinks = [],
}) {
  const activeSettings = { ...defaultHomeData.settings, ...settings }
  const brand = activeSettings.brand_name || 'G3B Education'
  const logoUrl = activeSettings.header_logo_url
    ? resolveMediaUrl(activeSettings.header_logo_url)
    : '/logo.png'
  const tagline =
    content.footer?.body ||
    defaultHomeData.content?.footer?.body ||
    'Career Guidance · Psychometric Assessment · Study Abroad'
  const year = new Date().getFullYear()

  const activeSocialLinks =
    socialLinks && socialLinks.length > 0
      ? socialLinks
      : defaultHomeData.socialLinks && defaultHomeData.socialLinks.length > 0
        ? defaultHomeData.socialLinks
        : [
            { id: 'wa', platform: 'WhatsApp', url: 'https://wa.me/919820000000', icon: 'fab fa-whatsapp' },
            { id: 'li', platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'fab fa-linkedin-in' },
            { id: 'ig', platform: 'Instagram', url: 'https://instagram.com', icon: 'fab fa-instagram' },
          ]

  return (
    <footer className="g3b-site-footer" id="footer">
      <div className="container">
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '32px', marginBottom: '40px' }}>
          {/* Brand & Contact summary */}
          <div className="footer-col footer-brand-col">
            <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brand}
                  className="footer-logo-img"
                  style={{ height: '36px', width: 'auto' }}
                />
              ) : (
                <span className="brand-mark" aria-hidden="true">
                  <i className="fas fa-graduation-cap" />
                </span>
              )}
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B2C5F' }}>{brand}</span>
            </div>
            <p className="footer-about" style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#475569', marginBottom: '16px' }}>
              {activeSettings.seo_description ||
                'Empowering students and families with scientifically backed psychometric assessments, unbiased career counseling, and transparent overseas education planning from Nerul, Navi Mumbai.'}
            </p>

            {/* Verified contact points */}
            <div className="footer-contact-summary" style={{ fontSize: '0.88rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {activeSettings.contact_phone && (
                <div>
                  <i className="fas fa-phone-alt" style={{ width: '18px', color: '#e64e15' }} aria-hidden="true" />
                  <a href={`tel:${activeSettings.contact_phone_link || activeSettings.contact_phone}`} style={{ color: 'inherit', marginLeft: '6px', textDecoration: 'none' }}>
                    {activeSettings.contact_phone}
                  </a>
                </div>
              )}
              {activeSettings.contact_email && (
                <div>
                  <i className="fas fa-envelope" style={{ width: '18px', color: '#e64e15' }} aria-hidden="true" />
                  <a href={`mailto:${activeSettings.contact_email}`} style={{ color: 'inherit', marginLeft: '6px', textDecoration: 'none' }}>
                    {activeSettings.contact_email}
                  </a>
                </div>
              )}
              {activeSettings.contact_address && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <i className="fas fa-location-dot" style={{ width: '18px', color: '#e64e15', marginTop: '3px' }} aria-hidden="true" />
                  <span style={{ marginLeft: '6px' }}>{activeSettings.contact_address}</span>
                </div>
              )}
            </div>

            {activeSocialLinks.length > 0 && (
              <div className="footer-social" style={{ display: 'flex', gap: '10px' }}>
                {activeSocialLinks.map((link) => (
                  <a
                    key={link.id || link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    title={link.platform}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      color: '#0B2C5F',
                      textDecoration: 'none',
                    }}
                  >
                    <i className={link.icon || 'fas fa-link'} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Group 1: Company */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '16px' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/#why">About G3B Education</Link>
              </li>
              <li>
                <Link to="/#why">Why Choose G3B</Link>
              </li>
              <li>
                <Link to="/#team">Our Leadership & Team</Link>
              </li>
              <li>
                <Link to="/#approach">Our 3-Stage Approach</Link>
              </li>
              <li>
                <Link to="/#reviews">Student Success Stories</Link>
              </li>
              <li>
                <Link to="/#contact">Contact & Visit Us</Link>
              </li>
            </ul>
          </div>

          {/* Group 2: Services */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '16px' }}>Services</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/services#career-counselling">Career Counselling</Link>
              </li>
              <li>
                <Link to="/services#psychometric-assessment">Psychometric Assessment</Link>
              </li>
              <li>
                <Link to="/services#profile-building">Profile Building</Link>
              </li>
              <li>
                <Link to="/services#study-abroad">Study Abroad Guidance</Link>
              </li>
              <li>
                <Link to="/services#admissions-guidance">Admissions Guidance</Link>
              </li>
              <li>
                <Link to="/services#scholarships">Scholarship Guidance</Link>
              </li>
              <li>
                <Link to="/services#visa-guidance">Visa Documentation Guidance</Link>
              </li>
              <li>
                <Link to="/#destinations">Global Study Destinations</Link>
              </li>
            </ul>
          </div>

          {/* Group 3: Resources */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '16px' }}>Resources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/insights">Blogs & Articles</Link>
              </li>
              <li>
                <Link to="/#faqs">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link to="/#pathways">Career Guidance Resources</Link>
              </li>
              <li>
                <Link to="/#knowledge-hub">Overseas Education Guide</Link>
              </li>
              <li>
                <Link to="/#reviews">Student Video Reviews</Link>
              </li>
            </ul>
          </div>

          {/* Group 4: Collaboration */}
          <div className="footer-col">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2C5F', marginBottom: '16px' }}>Collaboration</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/partner-with-us" style={{ fontWeight: 600, color: '#e64e15' }}>
                  <i className="fas fa-handshake" style={{ marginRight: '6px' }} /> Partner With Us
                </Link>
              </li>
              <li>
                <Link to="/partner-with-us#partner-form">Partnership Enquiry</Link>
              </li>
              <li>
                <Link to="/partner-with-us#opportunities">Educational Consultants</Link>
              </li>
              <li>
                <Link to="/partner-with-us#opportunities">Schools & Institutions</Link>
              </li>
              <li>
                <Link to="/partner-with-us#opportunities">Independent Counsellors</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom bar */}
        <div
          className="footer-bottom"
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          <p style={{ margin: 0 }}>
            {activeSettings.footer_copyright || `© ${year} ${brand}. All rights reserved.`}
          </p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>{tagline}</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/#contact" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <span>·</span>
            <Link to="/#contact" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
            <span>·</span>
            <Link to="/partner-with-us" style={{ color: 'inherit', textDecoration: 'none' }}>Partner Program</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
