import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

function detailRoute(service) {
  if (service.slug) return `/services/${encodeURIComponent(service.slug)}`
  const title = service.title || ''
  const match = /visa/i.test(title) ? 'visa-guidance' : /scholarship|funding/i.test(title) ? 'scholarships'
    : /test|IELTS|TOEFL|GRE|PTE/i.test(title) ? 'english-test-preparation'
      : /SOP|essay|resume|admission/i.test(title) ? 'admissions'
        : /university|shortlist|abroad/i.test(title) ? 'study-abroad'
          : /school|career|counselling/i.test(title) ? 'career-counselling' : null
  return match ? `/services/${match}` : '/services'
}

/**
 * Service cards on the homepage with feature highlights, quick consultation CTAs,
 * and direct links to the comprehensive /services page.
 */
export default function Services({ content = {}, services = [] }) {
  const { openModal } = useCounsellingModal()

  if (services.length === 0) return null

  return (
    <section className="section section-alt" id="services">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '8px' }}>
              {content.services?.heading || 'Comprehensive Services for Your Success'}
            </h2>
            {content.services?.subheading ? (
              <p className="section-subtitle" style={{ textAlign: 'left', margin: 0 }}>
                {content.services.subheading}
              </p>
            ) : null}
          </div>

          <Link to="/services" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Explore All Packages & Details</span>
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div className="service-card" key={service.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative' }}>
                {service.imageUrl ? (
                  <img
                    className="service-img"
                    src={resolveMediaUrl(service.imageUrl)}
                    alt={service.title}
                    loading="lazy"
                    decoding="async"
                    width="600"
                    height="360"
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  />
                ) : null}
                {service.badge ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(11, 44, 95, 0.9)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    {service.badge}
                  </span>
                ) : null}
              </div>

              <div className="service-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {service.icon ? <i className={service.icon} style={{ color: '#2563eb', fontSize: '18px' }} aria-hidden="true" /> : null}
                  <span>{service.title}</span>
                </h3>

                {service.subtitle ? (
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', margin: '-4px 0 8px 0' }}>
                    {service.subtitle}
                  </p>
                ) : null}

                {service.description ? <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{service.description}</p> : null}

                {service.features?.length > 0 ? (
                  <ul style={{ marginBottom: '16px', flex: 1 }}>
                    {service.features.map((feature, index) => (
                      <li key={index}>{typeof feature === 'object' ? feature?.text : feature}</li>
                    ))}
                  </ul>
                ) : null}

                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, minWidth: '140px' }}
                    onClick={() => openModal({ serviceInterest: service.title })}
                  >
                    <i className="fas fa-calendar-check" aria-hidden="true" /> Book Counselling
                  </button>
                  <Link
                    to={detailRoute(service)}
                    className="btn btn-ghost btn-sm"
                    title="Read full service breakdown, coaching packages and FAQs"
                  >
                    Details <i className="fas fa-arrow-right" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '36px',
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0B2C5F 0%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ color: '#ffffff', margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>
              Need help figuring out which service is right for you?
            </h3>
            <p style={{ color: '#93c5fd', margin: 0, fontSize: '14px' }}>
              Schedule a 1-on-1 discovery call with our certified study abroad counselors.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openModal()}
          >
            <i className="fas fa-phone-volume" aria-hidden="true" /> Get Free Consultation
          </button>
        </div>
      </div>
    </section>
  )
}
