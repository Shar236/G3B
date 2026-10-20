import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Study destination cards with editable flags, key bullet points, stay-back times,
 * work rights, and direct consultation CTAs.
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
          {destinations.map((destination) => (
            <div className="dest-card" key={destination.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative' }}>
                {destination.imageUrl ? (
                  <img
                    className="dest-img"
                    src={resolveMediaUrl(destination.imageUrl)}
                    alt={`Study in ${destination.country}`}
                    loading="lazy"
                    decoding="async"
                    width="600"
                    height="340"
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  />
                ) : null}

                {destination.flagIcon ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      fontSize: '22px',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      lineHeight: 1.2,
                    }}
                    title={`Flag of ${destination.country}`}
                  >
                    {destination.flagIcon}
                  </span>
                ) : null}
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

                {/* Metrics Badges: Stay Back & Work Rights */}
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
                        <span>{point}</span>
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
          ))}
        </div>
      </div>
    </section>
  )
}
