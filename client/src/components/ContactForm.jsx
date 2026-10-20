import ConsultationForm from './ui/ConsultationForm.jsx'

/**
 * Contact & Free Counselling section. Combines office contact info with the
 * unified ConsultationForm lead capture engine.
 */
export default function ContactForm({ content = {}, settings = {}, options = [], destinations = [] }) {
  return (
    <section className="section contact-section" id="contact">
      <div className="container">
        <h2 className="section-title">{content.contact?.heading || 'Contact Us & Free Counselling'}</h2>
        {content.contact?.subheading ? <p className="section-subtitle">{content.contact.subheading}</p> : null}

        <div className="contact-grid">
          <div className="contact-info">
            <h3>{settings.contact_office_heading || 'Head Office'}</h3>

            {settings.contact_address ? (
              <div className="contact-item">
                <i className="fas fa-map-marker-alt" aria-hidden="true" />
                <div>
                  <strong>Address</strong>
                  <p>
                    {settings.contact_address.split('\n').map((line, index) => (
                      <span key={index}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ) : null}

            {settings.contact_phone ? (
              <div className="contact-item">
                <i className="fas fa-phone-alt" aria-hidden="true" />
                <div>
                  <strong>Phone</strong>
                  <p>
                    <a href={`tel:${settings.contact_phone_link || settings.contact_phone}`}>{settings.contact_phone}</a>
                  </p>
                </div>
              </div>
            ) : null}

            {settings.contact_email ? (
              <div className="contact-item">
                <i className="fas fa-envelope" aria-hidden="true" />
                <div>
                  <strong>Email</strong>
                  <p>
                    <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                  </p>
                </div>
              </div>
            ) : null}

            {settings.working_hours ? (
              <div className="contact-item">
                <i className="fas fa-clock" aria-hidden="true" />
                <div>
                  <strong>Working Hours</strong>
                  <p>{settings.working_hours}</p>
                </div>
              </div>
            ) : null}

            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-certificate" style={{ color: '#fbbf24' }} /> Certified Counselors
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                {settings.founder_credentials_text || 'TESOL Certified Master Trainer · 15+ Years Guiding Global Aspirants'}
              </p>
            </div>
          </div>

          <div className="contact-form">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                Book Your Free Consultation
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                Fill out the details below. Our expert counsellors will contact you within 24 hours.
              </p>
            </div>

            <ConsultationForm
              options={options}
              destinations={destinations}
              inModal={false}
              theme="dark"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
