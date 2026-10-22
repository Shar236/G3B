import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowRight, Check, ChevronDown, Home } from 'lucide-react'
import { serviceBySlug } from '../data/services.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import usePageSeo from '../hooks/usePageSeo.js'
import '../styles/service-detail.css'
import ServiceInteractive from '../components/ServiceInteractive.jsx'

function Faqs({ items, slug }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="sd-faq-list">
      {items.map(([question, answer], index) => (
        <article key={question} className="sd-faq-item">
          <h3>
            <button
              type="button"
              aria-expanded={open === index}
              aria-controls={`${slug}-faq-${index}`}
              onClick={() => setOpen(open === index ? -1 : index)}
            >
              <span>{question}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          </h3>
          <div id={`${slug}-faq-${index}`} hidden={open !== index}>
            <p>{answer}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function ServiceDetailPage() {
  const { slug } = useParams()
  const service = serviceBySlug[slug]
  const { openModal } = useCounsellingModal()
  const heroRef = useRef(null)

  usePageSeo(
    service ? `/services/${service.slug}` : '/services',
    service ? { title: `${service.title} | G3B Education`, description: service.intro } : {}
  )

  // Interactive subtle cursor movement on geometric background
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
  }, [slug])

  const headlineLines = useMemo(() => {
    if (service?.headlineLines && service.headlineLines.length > 0) {
      return service.headlineLines
    }
    if (!service?.headline) return []
    const words = service.headline.split(/\s+/)
    const size = Math.ceil(words.length / 3)
    return [
      words.slice(0, size).join(' '),
      words.slice(size, size * 2).join(' '),
      words.slice(size * 2).join(' '),
    ].filter(Boolean)
  }, [service])

  if (!service) return <Navigate to="/services" replace />
  const Icon = service.icon
  const book = () => openModal({ serviceInterest: service.title, leadSource: `service-${service.slug}` })

  return (
    <div className={`service-detail sd-${service.slug}`}>
      {/* 1. HERO SECTION WITH EXACT REFERENCE DESIGN */}
      <section className="sd-hero" ref={heroRef} aria-label={`${service.title} Hero`}>
        {/* Geometric Grid Lines (Stable) */}
        <div className="sd-hero-grid-bg" aria-hidden="true" />

        {/* Concentric Circular Geometry Layer (Interactive Mouse Parallax) */}
        <div className="sd-hero-circles-layer" aria-hidden="true">
          <div className="sd-hero-circle sd-circle-1" />
          <div className="sd-hero-circle sd-circle-2" />
          <div className="sd-hero-circle sd-circle-3" />
          <div className="sd-hero-circle sd-circle-4" />
          <div className="sd-hero-radial-glow" />
        </div>

        <div className="container sd-hero-container">
          <nav className="sd-breadcrumb" aria-label="Breadcrumb">
            <Link to="/"><Home size={13} aria-hidden="true" /><span>Home</span></Link>
            <span className="sd-breadcrumb-separator" aria-hidden="true">/</span>
            <Link to="/services"><span>Services</span></Link>
            <span className="sd-breadcrumb-separator" aria-hidden="true">/</span>
            <span className="sd-breadcrumb-current" aria-current="page">{service.title}</span>
          </nav>

          <div className="sd-hero-copy">
            <div className="sd-kicker">
              <Icon size={16} aria-hidden="true" />
              <span>{service.title}</span>
            </div>

            <h1 aria-label={service.headline}>
              {headlineLines.map((line, index) => (
                <span className="sd-hero-line" key={line}>
                  <span style={{ '--line-idx': index }}>{line}</span>
                </span>
              ))}
            </h1>

            <p className="sd-hero-intro">{service.intro}</p>

            <div className="sd-actions">
              <button className="btn btn-primary" type="button" onClick={book}>
                <span>Book a consultation</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a href="#service-includes" className="sd-action-secondary">
                <span>See what is included</span>
                <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>

            <div className="sd-hero-notes" aria-label="How we work">
              <span>Student-first guidance</span>
              <span>Clear next steps</span>
              <span>Personalised support</span>
            </div>

            <a href="#service-audience" className="sd-hero-scroll" aria-label="Scroll down to content">
              <span>Explore details</span>
              <div className="sd-scroll-line" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. WHO IT IS FOR */}
      <section className="sd-audience" id="service-audience">
        <div className="container sd-split">
          <header>
            <span>01</span>
            <p className="sd-label">Who it is for</p>
            <h2>Guidance shaped around the decision in front of you.</h2>
          </header>
          <ul>
            {service.audience.map((item) => (
              <li key={item}>
                <Check size={17} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. WHAT IS INCLUDED */}
      <section className="sd-includes" id="service-includes">
        <div className="container">
          <header className="sd-wide-head">
            <div>
              <span>02</span>
              <p className="sd-label">What is included</p>
            </div>
            <h2>Specific support, explained in practical terms.</h2>
          </header>
          <div className="sd-includes-list">
            {service.includes.map(([title, text], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE DEMO / WORKFLOW */}
      <ServiceInteractive service={service} />

      {/* 5. HOW IT WORKS */}
      <section className="sd-process">
        <div className="container sd-process-grid">
          <header>
            <span>03</span>
            <p className="sd-label">How it works</p>
            <h2>A considered process, from context to next step.</h2>
            <p>Every conversation starts with the student’s circumstances. The sequence stays structured without treating two students as identical.</p>
          </header>
          <ol>
            {service.process.map(([title, text], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. EXPECTED OUTCOMES / BENEFITS */}
      <section className="sd-outcomes">
        <div className="container sd-split">
          <header>
            <span>04</span>
            <p className="sd-label">Expected outcomes</p>
            <h2>Move forward with a more useful sense of direction.</h2>
          </header>
          <div>
            {service.outcomes.map((item, i) => (
              <p key={item}>
                <span>0{i + 1}</span>
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="sd-faq">
        <div className="container sd-process-grid">
          <header>
            <span>05</span>
            <p className="sd-label">Questions, answered</p>
            <h2>Before you begin.</h2>
            <p>Your consultation can cover the circumstances specific to you.</p>
          </header>
          <Faqs items={service.faqs} slug={service.slug} />
        </div>
      </section>

      {/* 8. CONSULTATION CTA */}
      <section className="sd-cta">
        <div className="container">
          <div>
            <p className="sd-label">A sensible next conversation</p>
            <h2>Talk through where you are and what needs to happen next.</h2>
          </div>
          <button className="btn btn-primary" type="button" onClick={book}>
            <span>Book a consultation</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* 9. RELATED SERVICES */}
      <section className="sd-related">
        <div className="container">
          <p className="sd-label">Continue your journey</p>
          <h2>Related services</h2>
          <div>
            {service.related.map((slug) => {
              const item = serviceBySlug[slug]
              if (!item) return null
              const RelatedIcon = item.icon
              return (
                <Link key={slug} to={`/services/${slug}`}>
                  <RelatedIcon aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.intro}</small>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )
            })}
          </div>
          <Link className="sd-all" to="/services">
            <span>View all services</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}
