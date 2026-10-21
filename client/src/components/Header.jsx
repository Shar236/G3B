import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * KNG-inspired Information Architecture for G3B Education.
 * Preserves G3B's brand identity, typography, navy/white color scheme & orange accents.
 */
export const NAVIGATION_TREE = [
  {
    label: 'Home',
    url: '/',
  },
  {
    label: 'About G3B',
    url: '/#why',
    children: [
      {
        label: 'Why Choose G3B',
        url: '/#why',
        icon: 'fas fa-shield-halved',
        description: 'Our philosophy, credentials & student-first approach',
      },
      {
        label: 'Our Team',
        url: '/#team',
        icon: 'fas fa-user-tie',
        description: 'Experienced career mentors & admissions advisors',
      },
      {
        label: 'Our Approach',
        url: '/#approach',
        icon: 'fas fa-route',
        description: 'Discover, Plan, and Progress 3-stage framework',
      },
      {
        label: 'Student Success Stories',
        url: '/#reviews',
        icon: 'fas fa-star',
        description: 'Verified Google reviews & student video journeys',
      },
    ],
  },
  {
    label: 'Our Services',
    url: '/services',
    children: [
      {
        label: 'Career Counselling',
        url: '/services#career-guidance',
        icon: 'fas fa-user-graduate',
        description: 'Informed stream & course selection for high school & grads',
      },
      {
        label: 'Psychometric Assessment',
        url: '/services#career-guidance',
        icon: 'fas fa-brain',
        description: 'Scientific aptitude, personality & interest mapping',
      },
      {
        label: 'Profile Building',
        url: '/services#test-preparation',
        icon: 'fas fa-id-card',
        description: 'Extracurricular profiling, summer roadmap & skills',
      },
      {
        label: 'Study Abroad',
        url: '/services#university-selection',
        icon: 'fas fa-globe-americas',
        description: 'Strategic admissions & dream university shortlisting',
      },
      {
        label: 'Admissions Guidance',
        url: '/services#visa-documentation',
        icon: 'fas fa-file-signature',
        description: 'Statement of Purpose (SOP) & application filings',
      },
      {
        label: 'Scholarship Guidance',
        url: '/services#scholarships-financial-aid',
        icon: 'fas fa-hand-holding-dollar',
        description: 'Merit scholarship matching & education loan support',
      },
      {
        label: 'Visa Guidance',
        url: '/services#visa-documentation',
        icon: 'fas fa-passport',
        description: 'Embassy file verification & realistic mock interviews',
      },
      {
        label: 'Pre-departure Support',
        url: '/services#pre-departure-travel',
        icon: 'fas fa-plane-departure',
        description: 'Accommodation, flights, forex & relocation briefings',
      },
      {
        label: 'View All Services',
        url: '/services',
        icon: 'fas fa-arrow-right',
        description: 'Explore full coaching packages, pricing & FAQs',
        isHighlight: true,
      },
    ],
  },
  {
    label: 'Destinations',
    url: '/#destinations',
  },
  {
    label: 'Student Resources',
    url: '/insights',
    children: [
      {
        label: 'Blogs & Articles',
        url: '/insights',
        icon: 'fas fa-newspaper',
        description: 'Expert guides on study visas, post-study work & exams',
      },
      {
        label: 'Career Guidance Resources',
        url: '/insights/psychometric-assessment-and-career-clarity',
        icon: 'fas fa-book-open',
        description: 'In-depth clarity guides for ambitious students & parents',
      },
      {
        label: 'Frequently Asked Questions',
        url: '/#faqs',
        icon: 'fas fa-circle-question',
        description: 'Quick answers about test prep, admissions & fees',
      },
    ],
  },
  {
    label: 'Partner With Us',
    url: '/partner-with-us',
  },
  {
    label: 'Contact',
    url: '/#contact',
  },
]

export default function Header({ settings = {} }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef(null)
  const mobileToggleRef = useRef(null)
  const dropdownTriggerRefs = useRef({})
  const { openModal } = useCounsellingModal()

  const brand = settings.brand_name || 'G3B Education'
  const subheading = settings.header_subheading || 'Career Guidance · Study Abroad'
  const ctaLabel = settings.header_cta_label || 'Free Counselling'
  const logoUrl = settings.header_logo_url ? resolveMediaUrl(settings.header_logo_url) : '/logo.png'
  const onHome = location.pathname === '/'

  // Close menus on location change
  useEffect(() => {
    setMobileMenuOpen(false)
    setActiveDropdown(null)
  }, [location.pathname, location.search, location.hash])

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handlePointerDown(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null)
        setMobileMenuOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        const trigger = activeDropdown !== null
          ? dropdownTriggerRefs.current[activeDropdown]
          : mobileToggleRef.current
        setActiveDropdown(null)
        setMobileMenuOpen(false)
        trigger?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeDropdown])

  const handleLinkClick = (url, e) => {
    setMobileMenuOpen(false)
    setActiveDropdown(null)

    if (url.startsWith('/#') || url.startsWith('#')) {
      const hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''
      const targetId = hash.replace('#', '')

      if (onHome) {
        e.preventDefault()
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          window.history.pushState(null, '', `/#${targetId}`)
        }
      } else {
        // Navigating from another page to home anchor
        navigate(`/${hash}`)
      }
    }
  }

  const handleCtaClick = (e) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    setActiveDropdown(null)
    if (settings.header_cta_url && settings.header_cta_url.startsWith('http')) {
      window.open(settings.header_cta_url, '_blank', 'noopener,noreferrer')
    } else {
      openModal()
    }
  }

  const isItemActive = (item) => {
    if (item.url === '/' && location.pathname === '/' && !location.hash) return true
    if (item.url === '/services' && location.pathname === '/services') return true
    if (item.url === '/insights' && location.pathname.startsWith('/insights')) return true
    if (item.url === '/partner-with-us' && location.pathname === '/partner-with-us') return true
    if (item.url.includes('#') && location.hash === item.url.slice(item.url.indexOf('#'))) return true
    if (item.children) {
      return item.children.some((child) => isItemActive(child))
    }
    return false
  }

  return (
    <header className="g3b-site-header" ref={navRef}>
      <div className="container g3b-header-inner">
        {/* Brand Logo and Name */}
        <Link className="g3b-brand" to="/" aria-label={`${brand} home`}>
          {logoUrl ? (
            <img src={logoUrl} alt={brand} className="brand-logo-img" />
          ) : (
            <span className="brand-mark" aria-hidden="true">
              <i className="fas fa-graduation-cap" />
            </span>
          )}
          <span>
            {brand}
            <span className="brand-sub">{subheading}</span>
          </span>
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav
          className={`g3b-navigation${mobileMenuOpen ? ' open' : ''}`}
          aria-label="Primary site navigation"
          id="main-navigation"
        >
          <ul className="g3b-menu">
            {NAVIGATION_TREE.map((item, idx) => {
              const hasChildren = Boolean(item.children && item.children.length > 0)
              const isOpen = activeDropdown === idx
              const active = isItemActive(item)

              if (!hasChildren) {
                const isInternal = item.url.startsWith('/') && !item.url.startsWith('/#')
                return (
                  <li key={idx} className="nav-item">
                    {isInternal ? (
                      <Link
                        to={item.url}
                        className={`nav-link${active ? ' active' : ''}`}
                        onClick={(e) => handleLinkClick(item.url, e)}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.url}
                        className={`nav-link${active ? ' active' : ''}`}
                        onClick={(e) => handleLinkClick(item.url, e)}
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                )
              }

              // Dropdown parent item
              const isMega = item.children.length > 4
              return (
                <li
                  key={idx}
                  className={`nav-item has-dropdown${isOpen ? ' dropdown-open' : ''}`}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                      setActiveDropdown(idx)
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                      setActiveDropdown(null)
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`nav-link dropdown-toggle${active ? ' active' : ''}`}
                    ref={(element) => { dropdownTriggerRefs.current[idx] = element }}
                    aria-controls={`navigation-dropdown-${idx}`}
                    aria-expanded={isOpen}
                    onClick={() => setActiveDropdown(isOpen ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActiveDropdown(idx)
                        requestAnimationFrame(() => {
                          document.getElementById(`navigation-dropdown-${idx}`)?.querySelector('a')?.focus()
                        })
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    <i
                      className="fas fa-chevron-down dropdown-arrow"
                      style={{
                        fontSize: '11px',
                        marginLeft: '5px',
                        transition: 'transform 0.2s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                      }}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Dropdown Menu Container */}
                  <div
                    id={`navigation-dropdown-${idx}`}
                    className={`dropdown-menu ${isMega ? 'mega-menu' : 'standard-dropdown'}`}
                    aria-label={item.label}
                    hidden={!isOpen}
                  >
                    <div className={isMega ? 'mega-menu-grid' : 'dropdown-list'}>
                      {item.children.map((child, cIdx) => {
                        const childActive = isItemActive(child)
                        const isChildInternal = child.url.startsWith('/') && !child.url.startsWith('/#')

                        const content = (
                          <div className={`dropdown-item-content${child.isHighlight ? ' highlight' : ''}`}>
                            {child.icon ? (
                              <div className="dropdown-item-icon">
                                <i className={child.icon} aria-hidden="true" />
                              </div>
                            ) : null}
                            <div className="dropdown-item-text">
                              <span className="dropdown-item-title">{child.label}</span>
                              {child.description ? (
                                <span className="dropdown-item-desc">{child.description}</span>
                              ) : null}
                            </div>
                          </div>
                        )

                        return (
                          <div key={cIdx} className="dropdown-item-wrapper">
                            {isChildInternal ? (
                              <Link
                                to={child.url}
                                className={`dropdown-link${childActive ? ' active' : ''}`}
                                onClick={(e) => handleLinkClick(child.url, e)}
                              >
                                {content}
                              </Link>
                            ) : (
                              <a
                                href={child.url}
                                className={`dropdown-link${childActive ? ' active' : ''}`}
                                onClick={(e) => handleLinkClick(child.url, e)}
                              >
                                {content}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Mobile Menu In-Drawer CTA */}
          <div className="mobile-drawer-cta">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleCtaClick}
            >
              <i className="fas fa-paper-plane" aria-hidden="true" /> {ctaLabel}
            </button>
          </div>
        </nav>

        {/* Header Actions: Primary Free Counselling CTA & Mobile Hamburger */}
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm header-counselling-cta"
            onClick={handleCtaClick}
            aria-label="Book Free Counselling Session"
          >
            <i className="fas fa-paper-plane" aria-hidden="true" />
            <span>{ctaLabel}</span>
          </button>

          <button
            type="button"
            className="nav-toggle"
            ref={mobileToggleRef}
            aria-expanded={mobileMenuOpen}
            aria-controls="main-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <i className={mobileMenuOpen ? 'fas fa-xmark' : 'fas fa-bars'} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
