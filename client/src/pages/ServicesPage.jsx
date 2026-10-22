import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Compass } from 'lucide-react'
import { services } from '../data/services.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import usePageSeo from '../hooks/usePageSeo.js'
import '../styles/services.css'

const featured = [services[0], services[3], services[4]]
const overviewLines = [
  'Guidance for Every Step',
  'of Your Academic Journey.',
]

export default function ServicesPage() {
  const { openModal } = useCounsellingModal()
  const heroRef = useRef(null)
  const book = () => openModal({ serviceInterest: 'General Counselling', leadSource: 'services-overview' })
  usePageSeo('/services', {
    title: 'Student Guidance Services | G3B Education',
    description: 'Career counselling, assessment, profile building, study abroad, admissions, scholarships, visa, pre-departure and English test preparation support.',
  })

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined
    const onMove = (event) => {
      const rect = hero.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      hero.style.setProperty('--hero-x', `${x * 100}%`)
      hero.style.setProperty('--hero-y', `${y * 100}%`)
      hero.style.setProperty('--circle-shift-x', `${(x - 0.5) * 18}px`)
      hero.style.setProperty('--circle-shift-y', `${(y - 0.5) * 14}px`)
    }
    hero.addEventListener('pointermove', onMove, { passive: true })
    return () => hero.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div className="services-overview">
      <section className="so-hero" ref={heroRef} aria-label="Services Overview Hero">
        <div className="so-hero-grid-bg" aria-hidden="true" />
        <div className="so-hero-circles-layer" aria-hidden="true">
          <div className="so-hero-circle so-circle-1" />
          <div className="so-hero-circle so-circle-2" />
          <div className="so-hero-circle so-circle-3" />
          <div className="so-hero-radial-glow" />
        </div>

        <div className="container so-hero-container">
          <div className="so-hero-copy">
            <div className="so-kicker">
              <Compass size={16} aria-hidden="true" />
              <span>G3B Education services</span>
            </div>

            <h1 aria-label="Guidance for Every Step of Your Academic Journey.">
              {overviewLines.map((line, index) => (
                <span className="so-hero-line" key={line}>
                  <span style={{ '--line-idx': index }}>{line}</span>
                </span>
              ))}
            </h1>

            <p className="so-intro">
              The important decisions rarely arrive one at a time. We help students understand where they are, decide what deserves attention next, and move forward with a plan that fits their circumstances.
            </p>

            <div className="so-actions">
              <a className="btn btn-primary" href="#service-directory">
                <span>Explore services</span>
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <button className="btn so-secondary" type="button" onClick={book}>
                <span>Talk to a counsellor</span>
              </button>
            </div>

            <div className="so-hero-notes" aria-label="Areas of guidance">
              <span>Career direction</span>
              <span>Applications</span>
              <span>Study abroad</span>
            </div>
          </div>
        </div>
      </section>

      <section className="so-directory" id="service-directory">
        <div className="container">
          <header>
            <p className="so-kicker">Find your starting point</p>
            <h2>Nine services. One clear academic journey.</h2>
            <p>Choose the decision closest to you now. Each service works independently and connects naturally with the next stage.</p>
          </header>
          <ol>
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <li key={service.slug}>
                  <Link to={`/services/${service.slug}`}>
                    <span className="so-index">{String(index + 1).padStart(2, '0')}</span>
                    <Icon aria-hidden="true" />
                    <span>
                      <strong>{service.title}</strong>
                      <small>{service.intro}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="so-featured" aria-label="Featured services">
        <div className="container">
          {featured.map((service, index) => (
            <article key={service.slug} className={index % 2 ? 'reverse' : ''}>
              <div>
                <img src={service.image} alt={service.alt} width="700" height="520" />
              </div>
              <div>
                <span>0{index + 1} / Featured guidance</span>
                <h2>{service.headline}</h2>
                <p>{service.intro}</p>
                <ul>
                  {service.includes.slice(0, 3).map(([title]) => (
                    <li key={title}>
                      <Check size={16} aria-hidden="true" />
                      <span>{title}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/services/${service.slug}`}>
                  <span>Explore {service.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="so-journey">
        <div className="container">
          <header>
            <p className="so-kicker">How support connects</p>
            <h2>Start with clarity. Build carefully. Prepare completely.</h2>
          </header>
          <div>
            {[
              ['01', 'Discover', 'Career counselling and assessment help you understand possible directions.'],
              ['02', 'Develop', 'Profile building and test preparation strengthen skills and readiness.'],
              ['03', 'Apply', 'Study abroad, admissions and scholarship guidance bring the plan together.'],
              ['04', 'Transition', 'Visa documentation and pre-departure support prepare you for the move.'],
            ].map(([n, t, p]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="so-consult">
        <div className="container">
          <div>
            <p className="so-kicker">Not sure where to begin?</p>
            <h2>A short conversation can help identify the right starting point.</h2>
            <p>Tell us about the student’s current stage, the decision ahead and any deadline already in view.</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={book}>
            <span>Book a consultation</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}
