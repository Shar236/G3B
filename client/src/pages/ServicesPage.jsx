import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSiteContent } from '../components/layout/PublicLayout.jsx'
import usePageSeo from '../hooks/usePageSeo.js'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import Pathways from '../components/Pathways.jsx'
import defaultHomeData from '../data/defaultHomeContent.js'

/** Interactive Accordion Component for Service FAQs with accessibility */
function FaqAccordion({ items = [], serviceSlug = 'service' }) {
  const [openIndex, setOpenIndex] = useState(0)

  if (!items || items.length === 0) return null

  return (
    <div className="service-faq-wrapper">
      <h4 className="service-subheading">
        <i className="fas fa-circle-question" style={{ color: '#2563eb' }} aria-hidden="true" />
        <span>Frequently Asked Questions</span>
      </h4>
      <div className="service-faq-container">
        {items.map((faq, idx) => {
          const isOpen = openIndex === idx
          const btnId = `faq-btn-${serviceSlug}-${idx}`
          const regionId = `faq-panel-${serviceSlug}-${idx}`

          return (
            <div key={idx} className={`service-faq-item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                id={btnId}
                className="service-faq-btn"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                aria-controls={regionId}
              >
                <span>{faq.q || faq.question}</span>
                <i
                  className="fas fa-chevron-down service-faq-chevron"
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div
                  id={regionId}
                  role="region"
                  aria-labelledby={btnId}
                  className="service-faq-content"
                >
                  {faq.a || faq.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const NAV_LABELS = {
  'test-preparation': 'Test Preparation',
  'career-guidance': 'Career Guidance',
  'university-selection': 'University Selection',
  'visa-documentation': 'Application & Visa',
  'scholarships-financial-aid': 'Scholarships & Aid',
  'pre-departure-travel': 'Travel & Relocation',
}

/** Comprehensive, dynamic "Our Services" page with premium editorial design */
export default function ServicesPage() {
  const { data } = useSiteContent()
  const location = useLocation()
  const { openModal } = useCounsellingModal()
  const [activeServiceId, setActiveServiceId] = useState('')
  const observerRef = useRef(null)

  const services = (data?.services && data.services.length > 0) ? data.services : (defaultHomeData.services || [])
  const settings = data?.settings || defaultHomeData.settings || {}

  // Metadata published in the admin SEO manager wins; these strings are the
  // fallback for an unregistered route or while the request is in flight.
  usePageSeo('/services', {
    title: 'Our Comprehensive Services | G3B Education Study Abroad & Test Prep',
    description: 'Explore G3B Education’s 6 core services: Test Preparation (IELTS/PTE), Career Guidance, University Shortlisting, Visa Documentation, Scholarships and Travel Arrangements.',
    keywords: 'study abroad services, IELTS coaching, career assessment, university selection, visa documentation, scholarship guidance, G3B Education',
  })

  // Handle URL hash jumping and active pill sync
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      if (services.length > 0) {
        setActiveServiceId(services[0].slug || services[0].id)
      }
      return
    }
    const hash = location.hash.slice(1)
    setActiveServiceId(hash)
    const target = document.getElementById(hash)
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [location.hash, services])

  // ScrollSpy with IntersectionObserver to track visible service section
  useEffect(() => {
    if (!services || services.length === 0) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((e) => e.isIntersecting)
        if (visibleEntry) {
          setActiveServiceId(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-130px 0px -50% 0px',
        threshold: 0.1,
      }
    )

    services.forEach((s) => {
      const id = s.slug || s.id
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    observerRef.current = observer
    return () => observer.disconnect()
  }, [services])

  // Smooth scroll handler for service navigation tabs
  const handleNavClick = (e, slug) => {
    e.preventDefault()
    setActiveServiceId(slug)
    const target = document.getElementById(slug)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${slug}`)
    }
  }

  const contactPhone = settings.contact_phone || '8928659569'
  const contactPhoneLink = settings.contact_phone_link || '8928659569'

  return (
    <div className="services-page-wrap">
      {/* 1. Services Hero Section */}
      <section className="services-hero-premium" aria-labelledby="services-hero-heading">
        <div className="services-hero-container">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="services-breadcrumb">
            <ol>
              <li>
                <Link to="/" title="Return to G3B Education homepage">
                  <i className="fas fa-home" style={{ marginRight: '6px', fontSize: '11px' }} aria-hidden="true" />
                  Home
                </Link>
              </li>
              <li className="separator" aria-hidden="true">/</li>
              <li className="current" aria-current="page">Our Services</li>
            </ol>
          </nav>

          {/* Eyebrow Label */}
          <div className="services-eyebrow-pill">
            <i className="fas fa-layer-group" aria-hidden="true" />
            <span>End-to-End Study Abroad Support</span>
          </div>

          {/* Main Compelling Heading */}
          <h1 id="services-hero-heading" className="services-hero-title">
            Your Global Education Journey, Guided from Dream to Departure.
          </h1>

          {/* Concise Description */}
          <p className="services-hero-desc">
            {settings.services_hero_subheading ||
              'Discover our integrated 6-pillar framework pairing scientific psychometric mapping and certified IELTS/PTE coaching with strategic university shortlisting, 98% visa success, and stress-free overseas relocation.'}
          </p>

          {/* 4 Verified Statistics Cards */}
          <div className="services-stats-grid" role="region" aria-label="Key Performance Statistics">
            <div className="services-stat-card">
              <span className="services-stat-value">15,000+</span>
              <span className="services-stat-label">Students Mentored</span>
            </div>
            <div className="services-stat-card">
              <span className="services-stat-value">98%</span>
              <span className="services-stat-label">Visa Success Rate</span>
            </div>
            <div className="services-stat-card">
              <span className="services-stat-value">15+</span>
              <span className="services-stat-label">Years Mentoring Experience</span>
            </div>
            <div className="services-stat-card">
              <span className="services-stat-value">TESOL</span>
              <span className="services-stat-label">Certified Faculty</span>
            </div>
          </div>

          {/* Primary Hero CTA */}
          <button
            type="button"
            className="btn btn-secondary services-hero-cta"
            onClick={() => openModal()}
            aria-label="Book a free counselling session with study abroad mentors"
          >
            <i className="fas fa-calendar-check" aria-hidden="true" />
            <span>Book Free Counselling</span>
          </button>
        </div>
      </section>

      {/* 2. Redesigned Service Navigation Strip */}
      <Pathways />
      <div className="services-nav-bar" role="navigation" aria-label="Services Navigation Strip">
        <div className="services-nav-container" role="tablist">
          {services.map((s, idx) => {
            const slug = s.slug || s.id
            const isActive = activeServiceId === slug
            const label = NAV_LABELS[slug] || s.title
            return (
              <a
                key={slug || idx}
                href={`#${slug}`}
                onClick={(e) => handleNavClick(e, slug)}
                className={`services-nav-item ${isActive ? 'is-active' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={slug}
                id={`tab-${slug}`}
                title={s.title}
                tabIndex={0}
              >
                <i className={s.icon || 'fas fa-graduation-cap'} aria-hidden="true" />
                <span>{label}</span>
              </a>
            )
          })}
        </div>
      </div>

      {/* 3. Six Premium Service Sections (Two-Column Layout) */}
      <main className="services-cards-wrapper" id="services-list">
        {services.map((service, index) => {
          const anchorId = service.slug || service.id
          const packages = Array.isArray(service.packages) ? service.packages : []
          const pricing = Array.isArray(service.pricing) ? service.pricing : []
          const trainers = Array.isArray(service.trainers) ? service.trainers : []
          const faqs = Array.isArray(service.faqs) ? service.faqs : []
          const features = Array.isArray(service.features) ? service.features : []
          const displayImage = service.imageUrl || service.image_url

          return (
            <article
              key={service.id || index}
              id={anchorId}
              className="service-card-premium"
              aria-labelledby={`service-heading-${anchorId}`}
            >
              {/* Header Band */}
              <header className="service-header-band">
                <div className="service-header-left">
                  <div className="service-pillar-eyebrow">
                    <span className="service-pillar-icon" aria-hidden="true">
                      <i className={service.icon || 'fas fa-graduation-cap'} />
                    </span>
                    <span className="pillar-index-badge">PILLAR 0{index + 1}</span>
                    {service.badge && (
                      <span className="service-badge-pill">{service.badge}</span>
                    )}
                  </div>

                  <h2 id={`service-heading-${anchorId}`} className="service-title">
                    {service.title}
                  </h2>

                  {service.subtitle && (
                    <p className="service-subtitle">{service.subtitle}</p>
                  )}

                  {service.description && (
                    <p className="service-desc">{service.description}</p>
                  )}
                </div>

                <div className="service-header-action">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openModal({ serviceInterest: service.title })}
                    aria-label={`Book counselling for ${service.title}`}
                  >
                    <i className="fas fa-calendar-check" aria-hidden="true" />
                    <span>{service.ctaLabel || 'Book This Service'}</span>
                  </button>
                </div>
              </header>

              {/* Main Two-Column Body Grid */}
              <div className="service-grid-body">
                {/* Left Column: Image, Deliverables, Mentors */}
                <div className="service-col-left">
                  {/* Service Image (16:9 Aspect Ratio) */}
                  {displayImage && (
                    <div className="service-image-box">
                      <img
                        src={resolveMediaUrl(displayImage)}
                        alt={`${service.title} study abroad preparation and mentoring`}
                        loading="lazy"
                        decoding="async"
                        width="640"
                        height="360"
                      />
                    </div>
                  )}

                  {/* Key Features & Deliverables */}
                  {features.length > 0 && (
                    <div className="service-deliverables-panel">
                      <h4 className="service-subheading">
                        <i className="fas fa-list-check" style={{ color: '#10b981' }} aria-hidden="true" />
                        <span>Key Features & Deliverables</span>
                      </h4>
                      <ul className="service-feature-checklist">
                        {features.map((feature, fIdx) => (
                          <li key={fIdx}>
                            <i className="fas fa-circle-check" aria-hidden="true" />
                            <span>{typeof feature === 'object' ? feature?.text : feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mentor Information Panel */}
                  {trainers.length > 0 && (
                    <div className="service-mentor-panel">
                      <h4 className="mentor-panel-heading">
                        <i className="fas fa-user-tie" aria-hidden="true" />
                        <span>Mentors Leading This Pillar</span>
                      </h4>
                      <div className="mentor-list">
                        {trainers.map((t, tIdx) => (
                          <div key={tIdx} className="mentor-card-mini">
                            <div className="mentor-avatar-badge" aria-hidden="true">
                              <i className="fas fa-chalkboard-user" />
                            </div>
                            <div className="mentor-info">
                              <h5 className="mentor-name">{t.name}</h5>
                              <p className="mentor-role">{t.title}</p>
                              {t.credentials && (
                                <span className="mentor-credential">{t.credentials}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Programs & Modules, Support Tiers, FAQs */}
                <div className="service-col-right">
                  {/* Available Coaching Programs & Modules */}
                  {packages.length > 0 && (
                    <div className="service-programs-wrapper">
                      <h4 className="service-subheading">
                        <i className="fas fa-cubes" style={{ color: '#2563eb' }} aria-hidden="true" />
                        <span>Available Coaching Programs & Modules</span>
                      </h4>
                      <div className="programs-stack">
                        {packages.map((pkg, pIdx) => (
                          <div
                            key={pIdx}
                            className={`program-card ${pkg.badge === 'Most Popular' ? 'is-popular' : ''}`}
                          >
                            <div className="program-card-header">
                              <h5 className="program-title">{pkg.name}</h5>
                              {pkg.badge && (
                                <span className="program-badge">{pkg.badge}</span>
                              )}
                            </div>

                            {pkg.duration && (
                              <div className="program-duration">
                                <i className="fas fa-clock" aria-hidden="true" />
                                <span>Duration: {pkg.duration}</span>
                              </div>
                            )}

                            {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                              <ul className="program-features-list">
                                {pkg.features.map((feat, fIdx) => (
                                  <li key={fIdx}>
                                    <i className="fas fa-check" aria-hidden="true" />
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Support Tiers */}
                  {pricing.length > 0 && (
                    <div className="service-tiers-wrapper">
                      <h4 className="service-subheading">
                        <i className="fas fa-tag" style={{ color: '#10b981' }} aria-hidden="true" />
                        <span>Support Tiers</span>
                      </h4>
                      <div className="tiers-grid">
                        {pricing.map((tier, prIdx) => (
                          <div
                            key={prIdx}
                            className={`tier-card ${tier.highlight ? 'is-highlighted' : ''}`}
                          >
                            <div className="tier-header">
                              <strong className="tier-name">{tier.tier}</strong>
                              {tier.highlight && (
                                <span className="tier-badge">Recommended</span>
                              )}
                            </div>
                            <p className="tier-desc">{tier.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frequently Asked Questions */}
                  {faqs.length > 0 && (
                    <FaqAccordion items={faqs} serviceSlug={anchorId} />
                  )}
                </div>
              </div>

              {/* Bottom Contextual CTA Inside Card */}
              <footer className="service-footer-cta">
                <div className="service-footer-cta-text">
                  <i className="fas fa-circle-question" style={{ color: '#2563eb' }} aria-hidden="true" />
                  <span>
                    Have specific questions about <strong>{service.title}</strong>? Speak with a dedicated advisor.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openModal({ serviceInterest: service.title })}
                  aria-label={`Book counselling for ${service.title}`}
                >
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                  <span>Book Counselling for {service.title}</span>
                </button>
              </footer>
            </article>
          )
        })}
      </main>

      {/* 4. Bottom Global Conversion CTA Section */}
      <section className="services-bottom-conversion-cta" aria-labelledby="services-bottom-cta-heading">
        <div className="services-bottom-content">
          <h2 id="services-bottom-cta-heading" className="services-bottom-title">
            Ready to Begin Your Study Abroad Success Story?
          </h2>
          <p className="services-bottom-desc">
            Schedule your personalized consultation with Minal Kulkarni and our senior admissions committee. We evaluate your profile, recommend ideal courses, and chart your roadmap from dream to departure.
          </p>
          <div className="services-bottom-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openModal()}
              style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 700 }}
              aria-label="Book free counselling session"
            >
              <i className="fas fa-calendar-check" aria-hidden="true" />
              <span>Book Free Counselling Session</span>
            </button>

            <a
              href={`tel:${contactPhoneLink}`}
              className="btn btn-outline"
              style={{ padding: '14px 26px', fontSize: '16px', color: '#ffffff', borderColor: '#ffffff' }}
              aria-label={`Call G3B Education at ${contactPhone}`}
            >
              <i className="fas fa-phone" aria-hidden="true" />
              <span>Call {contactPhone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
