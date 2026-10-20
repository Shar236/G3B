import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Hero section: badge, headline, tagline, description, dynamic CTAs, background media,
 * and live stat counters.
 */
export default function Hero({ content = {}, settings = {}, stats = [] }) {
  const { openModal } = useCounsellingModal()
  const badge = settings.hero_badge || 'Career Guidance · Psychometric Assessment · Study Abroad'
  const careerUrl = settings.hero_cta_career_url || content.career_cta?.ctaUrl
  const bgImage = settings.hero_bg_image_url ? resolveMediaUrl(settings.hero_bg_image_url) : null

  const handleStartClick = (e) => {
    // If the configured CTA URL is an external link, allow normal navigation; otherwise trigger the booking modal
    const ctaUrl = content.hero?.ctaUrl
    if (ctaUrl && ctaUrl.startsWith('http')) {
      return
    }
    e.preventDefault()
    openModal()
  }

  return (
    <section
      className="hero"
      style={
        bgImage
          ? {
            backgroundImage: `linear-gradient(135deg, rgba(11, 44, 95, 0.92) 0%, rgba(15, 23, 42, 0.88) 100%), url('${bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
          : undefined
      }
    >
      <div className="container hero-content">
        <div className="hero-badge">
          <i className="fas fa-brain" aria-hidden="true" />
          {badge}
        </div>

        <h1>{content.hero?.heading || 'Study Abroad with Expert Career Guidance & Psychometric Assessment'}</h1>

        {content.hero?.subheading ? <p className="hero-tagline">{content.hero.subheading}</p> : null}

        {content.hero?.body ? <p className="hero-desc">{content.hero.body}</p> : null}

        <div className="hero-btns">
          <a
            href={content.hero?.ctaUrl || '#contact'}
            className="btn btn-primary"
            onClick={handleStartClick}
            aria-label="Book Free Counselling Session"
          >
            <i className="fas fa-rocket" aria-hidden="true" />
            {content.hero?.ctaLabel || 'Start Your Journey'}
          </a>

          {careerUrl ? (
            <a href={careerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-career">
              <i className="fas fa-compass" aria-hidden="true" />
              {settings.hero_cta_career_label || 'Career Mentor'}
            </a>
          ) : null}

          <Link to="/services" className="btn btn-outline">
            <i className="fas fa-list" aria-hidden="true" />
            {settings.hero_cta_services_label || 'Explore Services'}
          </Link>
        </div>

        {stats.length > 0 ? (
          <div className="hero-stats">
            {stats.map((stat) => (
              <div className="stat-item" key={stat.id}>
                <span className="stat-number">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
