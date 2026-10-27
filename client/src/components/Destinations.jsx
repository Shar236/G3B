import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

const COUNTRY_FALLBACK_IMAGES = {
  Australia: '/images/services-australia.jpg',
  'United Kingdom': '/images/services-uk.jpg',
  'United States': '/images/services-usa.jpg',
  Canada: '/images/services-canada.jpg',
  Germany: '/images/services-germany.jpg',
  France: '/images/services-france.jpg',
}

const COUNTRY_CODES = {
  Australia: 'AU',
  'United Kingdom': 'GB',
  'United States': 'US',
  Canada: 'CA',
  Germany: 'DE',
  France: 'FR',
  Ireland: 'IE',
}

/**
 * Study destination cards with pictures, country badges, key bullet points,
 * stay-back times, work rights, average tuition, and direct consultation CTAs.
 */
export default function Destinations({ content = {}, destinations = [] }) {
  const { openModal } = useCounsellingModal()

  if (destinations.length === 0) return null

  return (
    <section className="section" id="destinations">
      <div className="container">
        <h2 className="section-title">{content.destinations?.heading || 'Study Destinations'}</h2>
        {content.destinations?.subheading ? <p className="section-subtitle">{content.destinations.subheading}</p> : null}

        <div className="destinations-grid">
          {destinations.map((destination) => {
            const localImage = COUNTRY_FALLBACK_IMAGES[destination.country] || '/images/services-campus.jpg'
            const imageSrc = !destination.imageUrl || /^https:\/\/images\.unsplash\.com\//i.test(destination.imageUrl) ? localImage : destination.imageUrl
            const codeBadge = COUNTRY_CODES[destination.country] || destination.flagIcon || 'INT'

            return (
              <div className="dest-card" key={destination.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', background: '#e2e8f0' }}>
                  <img
                    className="dest-img"
                    src={resolveMediaUrl(imageSrc)}
                    alt={`Study in ${destination.country}`}
                    loading="lazy"
                    decoding="async"
                    width="600"
                    height="340"
                    onError={(event) => {
                      const fallback = COUNTRY_FALLBACK_IMAGES[destination.country] || '/images/services-campus.jpg'
                      if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback
                      else event.currentTarget.hidden = true
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#0B2C5F',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                      lineHeight: 1,
                    }}
                    title={`Country code for ${destination.country}`}
                  >
                    {codeBadge}
                  </span>
                </div>

                <div className="dest-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: '#0B2C5F' }}>
                    {destination.country}
                  </h3>

                  {destination.description ? (
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '12px' }}>
                      {destination.description}
                    </p>
                  ) : null}

                  {/* Metrics Badges: Stay Back, Work Rights & Average Tuition */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {destination.stayBackTime ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#0369a1',
                          background: '#f0f9ff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-clock" aria-hidden="true" />
                        <span>{destination.stayBackTime}</span>
                      </div>
                    ) : null}

                    {destination.workRights ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#15803d',
                          background: '#f0fdf4',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-briefcase" aria-hidden="true" />
                        <span>{destination.workRights}</span>
                      </div>
                    ) : null}

                    {destination.avgTuition ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#b45309',
                          background: '#fefce8',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-coins" aria-hidden="true" />
                        <span>Avg: {destination.avgTuition}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Highlight Points */}
                  {destination.points?.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {destination.points.map((point, index) => (
                        <li key={index} style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <i className="fas fa-check" style={{ color: '#10b981', marginTop: '3px', fontSize: '12px' }} aria-hidden="true" />
                          <span>{typeof point === 'object' ? point?.text : point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Card CTA */}
                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-block btn-sm"
                      onClick={() => openModal({ preferredDestination: destination.country })}
                    >
                      <i className="fas fa-paper-plane" aria-hidden="true" /> Apply for {destination.country}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
