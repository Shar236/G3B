import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

const NAVIGATION_TREE = [
  { label: 'Home', url: '/' },
  {
    label: 'About G3B', url: '/#why', children: [
      { label: 'Why Choose G3B', url: '/#why', icon: 'fas fa-shield-halved', description: 'Get to know our student-first approach.' },
      { label: 'Destinations', url: '/#destinations', icon: 'fas fa-globe-americas', description: 'Explore top study destinations and universities.' },
      { label: 'Our Approach', url: '/#approach', icon: 'fas fa-route', description: 'A clear, guided path to your next step.' },
      { label: 'Student Success Stories', url: '/#reviews', icon: 'fas fa-star', description: 'Experiences shared by students and families.' },
      { label: 'Media Gallery', url: '/about/media', icon: 'fas fa-photo-film', description: 'Moments, activities, photographs and video stories.' },
    ],
  },
  {
    label: 'Our Services', url: '/services', children: [
      { label: 'Career Counselling', url: '/services/career-counselling', icon: 'fas fa-user-graduate', description: 'Find courses and careers that fit your strengths.' },
      { label: 'Psychometric Assessment', url: '/services/psychometric-assessment', icon: 'fas fa-brain', description: 'Understand aptitude, interests and personality.' },
      { label: 'Profile Building', url: '/services/profile-building', icon: 'fas fa-id-card', description: 'Plan skills, projects and meaningful experiences.' },
      { label: 'Study Abroad', url: '/services/study-abroad', icon: 'fas fa-globe', description: 'Explore countries, courses and universities.' },
      { label: 'Admissions Guidance', url: '/services/admissions', icon: 'fas fa-file-signature', description: 'Navigate documents, statements and applications.' },
      { label: 'India Admissions', url: '/services/india-admissions', icon: 'fas fa-building-columns', description: 'Plan courses, eligibility and applications in India.' },
      { label: 'Scholarship Guidance', url: '/services/scholarships', icon: 'fas fa-hand-holding-dollar', description: 'Explore funding options and eligibility.' },
      { label: 'Visa Guidance', url: '/services/visa-guidance', icon: 'fas fa-passport', description: 'Prepare documents and understand next steps.' },
      { label: 'Pre-departure Support', url: '/services/pre-departure', icon: 'fas fa-plane-departure', description: 'Get ready for travel and student life abroad.' },
      { label: 'English Test Preparation', url: '/services/english-test-preparation', icon: 'fas fa-language', description: 'Prepare for IELTS, TOEFL and PTE.' },
      { label: 'View All Services', url: '/services', icon: 'fas fa-arrow-right', description: 'Discover support for every stage of your journey.', isHighlight: true },
    ],
  },
  {
    label: 'Study Abroad', url: '/study-abroad/my-dream-college', children: [
      { label: 'My Dream College', url: '/study-abroad/my-dream-college', icon: 'fas fa-building-columns', description: 'Search and shortlist verified university options.' },
      { label: 'My Dream Program', url: '/study-abroad/my-dream-program', icon: 'fas fa-book-open', description: 'Find and compare verified study programs.' },
    ],
  },
  {
    label: 'Assessments', url: '/assessments', children: [
      { label: 'Student Assessments', url: '/assessments#student-assessments', icon: 'fas fa-user-graduate', description: 'Discover strengths, interests and suitable directions.' },
      { label: 'Professional Assessments', url: '/assessments#professional-assessments', icon: 'fas fa-briefcase', description: 'Plan growth, transition or higher studies.' },
      { label: 'Aptitude & Personality Insights', url: '/assessments#aptitude-insights', icon: 'fas fa-brain', description: 'Understand aptitude, personality and work style.' },
      { label: 'Sample Reports', url: '/assessments#sample-reports', icon: 'fas fa-file-lines', description: 'Preview an illustrative assessment report.' },
    ],
  },
  {
    label: 'Student Resources', url: '/insights', children: [
      { label: 'Student Dashboard', url: '/student/dashboard', icon: 'fas fa-table-columns', description: 'Access your profile and counselling enquiries.' },
      { label: 'Blogs & Articles', url: '/insights', icon: 'fas fa-newspaper', description: 'Explore practical guidance for your next step.' },
      { label: 'Career Guidance Resources', url: '/#pathways', icon: 'fas fa-book-open', description: 'Find a pathway for your academic stage.' },
      { label: 'Frequently Asked Questions', url: '/#faqs', icon: 'fas fa-circle-question', description: 'Get answers about G3B and our services.' },
    ],
  },
  { label: 'Partner With Us', url: '/partner-with-us' },
  { label: 'Contact', url: '/#contact' },
]

const COMPACT_QUERY = '(max-width: 1340px)'
const canHover = () => Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
const isCompact = () => window.matchMedia ? window.matchMedia(COMPACT_QUERY).matches : true

export default function Header({ settings = {}, navigation = [] }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [pinnedDropdown, setPinnedDropdown] = useState(null)
  const location = useLocation()
  const navRef = useRef(null)
  const mobileToggleRef = useRef(null)
  const dropdownTriggerRefs = useRef({})
  const { openModal } = useCounsellingModal()
  const brand = settings.brand_name || 'G3B Education'
  const subheading = settings.header_subheading || 'Career Guidance · Study Abroad'
  const ctaLabel = settings.header_cta_label || 'Free Counselling'
  const logoUrl = settings.header_logo_url ? resolveMediaUrl(settings.header_logo_url) : '/logo.png'
  const menu = settings.navigation_mode === 'managed'
    ? navigation.filter((item) => /^\/|^#/.test(item.url || '')).map((item) => ({ label: item.label, url: item.url, isButton: item.isButton }))
    : NAVIGATION_TREE

  const closeMenus = () => {
    setMobileMenuOpen(false)
    setActiveDropdown(null)
    setPinnedDropdown(null)
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMobileMenuOpen(false)
      setActiveDropdown(null)
      setPinnedDropdown(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    const media = window.matchMedia?.(COMPACT_QUERY)
    const handleResize = () => {
      setMobileMenuOpen(false)
      setActiveDropdown(null)
      setPinnedDropdown(null)
    }
    media?.addEventListener?.('change', handleResize)
    return () => media?.removeEventListener?.('change', handleResize)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!navRef.current?.contains(event.target)) {
        setActiveDropdown(null)
        setPinnedDropdown(null)
        setMobileMenuOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        const trigger = mobileMenuOpen ? mobileToggleRef.current : dropdownTriggerRefs.current[activeDropdown]
        setActiveDropdown(null)
        setPinnedDropdown(null)
        setMobileMenuOpen(false)
        trigger?.focus()
      }
      if (event.key === 'Tab' && mobileMenuOpen) {
        const controls = [...navRef.current.querySelectorAll('a[href], button:not(:disabled)')]
          .filter((element) => !element.closest('[hidden]') && (!element.classList.contains('header-counselling-cta') || element.classList.contains('mobile-counselling-cta')))
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeDropdown, mobileMenuOpen])

  const handleLinkClick = (url) => {
    closeMenus()
    // A repeated hash does not cause a router location change.
    if (`${location.pathname}${location.hash}` === url && location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }

  const handleCtaClick = () => {
    if (mobileMenuOpen) mobileToggleRef.current?.focus()
    closeMenus()
    openModal()
  }

  const isItemActive = (item) => {
    const [path, hash] = item.url.split('#')
    if (hash) return location.pathname === path && location.hash === `#${hash}` || Boolean(item.children?.some(isItemActive))
    if (item.url === '/') return location.pathname === '/' && !location.hash
    if (location.pathname === path || location.pathname.startsWith(`${path}/`)) return true
    return Boolean(item.children?.some(isItemActive))
  }

  const focusDropdown = (idx, last = false) => {
    setActiveDropdown(idx)
    setPinnedDropdown(idx)
    requestAnimationFrame(() => {
      const links = document.getElementById(`navigation-dropdown-${idx}`)?.querySelectorAll('a')
      links?.[last ? links.length - 1 : 0]?.focus()
    })
  }

  const handleDropdownKeys = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const links = [...event.currentTarget.querySelectorAll('a')]
    const index = links.indexOf(document.activeElement)
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)
    next = (next + links.length) % links.length
    event.preventDefault()
    links[next]?.focus()
  }

  return (
    <header className={`g3b-site-header${mobileMenuOpen ? ' menu-is-open' : ''}`} ref={navRef}>
      <div className="container g3b-header-inner">
        <Link className="g3b-brand" to="/" aria-label={`${brand} home`} onClick={closeMenus}>
          <img src={logoUrl} alt="" className="brand-logo-img" width="50" height="50" />
          <span className="g3b-brand-copy"><strong>{brand}</strong><span className="brand-sub">{subheading}</span></span>
        </Link>
        <nav className={`g3b-navigation${mobileMenuOpen ? ' open' : ''}`} aria-label="Primary site navigation" id="main-navigation">
          <ul className="g3b-menu">
            {menu.map((item, idx) => {
              const active = isItemActive(item)
              const isOpen = activeDropdown === idx
              if (!item.children?.length) return <li key={item.label} className="nav-item"><Link to={item.url} className={`nav-link${item.isButton ? ' nav-managed-cta' : ''}${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => handleLinkClick(item.url)}>{item.label}</Link></li>
              const isMega = item.children.length > 4
              return (
                <li key={item.label} className={`nav-item has-dropdown${isOpen ? ' dropdown-open' : ''}`}
                  onPointerEnter={(event) => { if (event.pointerType !== 'touch' && canHover() && !isCompact()) setActiveDropdown(idx) }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch' && canHover() && !isCompact() && pinnedDropdown !== idx && !event.currentTarget.contains(document.activeElement)) setActiveDropdown(null)
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setActiveDropdown((current) => current === idx ? null : current)
                      setPinnedDropdown((current) => current === idx ? null : current)
                    }
                  }}>
                  <button type="button" id={`navigation-trigger-${idx}`} className={`nav-link dropdown-toggle${active ? ' active' : ''}`}
                    ref={(element) => { dropdownTriggerRefs.current[idx] = element }}
                    aria-controls={`navigation-dropdown-${idx}`} aria-expanded={isOpen}
                    onClick={() => {
                      if (isOpen && pinnedDropdown === idx) { setActiveDropdown(null); setPinnedDropdown(null) }
                      else { setActiveDropdown(idx); setPinnedDropdown(idx) }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusDropdown(idx, event.key === 'ArrowUp') }
                    }}>
                    <span>{item.label}</span><i className="fas fa-chevron-down dropdown-arrow" aria-hidden="true" />
                  </button>
                  <div id={`navigation-dropdown-${idx}`} className={`dropdown-menu ${isMega ? 'mega-menu' : 'standard-dropdown'}`} aria-labelledby={`navigation-trigger-${idx}`} hidden={!isOpen} onKeyDown={handleDropdownKeys}>
                    <div className={isMega ? 'mega-menu-grid' : 'dropdown-list'}>
                      {item.children.map((child) => (
                        <div key={child.label} className={`dropdown-item-wrapper${child.isHighlight ? ' is-highlight' : ''}`}>
                          <Link to={child.url} className={`dropdown-link${isItemActive(child) ? ' active' : ''}`} onClick={() => handleLinkClick(child.url)}>
                            <span className={`dropdown-item-content${child.isHighlight ? ' highlight' : ''}`}>
                              <span className="dropdown-item-icon"><i className={child.icon} aria-hidden="true" /></span>
                              <span className="dropdown-item-text"><span className="dropdown-item-title">{child.label}</span><span className="dropdown-item-desc">{child.description}</span></span>
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mobile-drawer-cta"><button type="button" className="header-counselling-cta mobile-counselling-cta" onClick={handleCtaClick}>{ctaLabel}<i className="fas fa-arrow-right" aria-hidden="true" /></button></div>
        </nav>
        <div className="header-actions">
          <button type="button" className="header-counselling-cta" onClick={handleCtaClick} aria-label="Book Free Counselling Session"><span>{ctaLabel}</span><i className="fas fa-arrow-right" aria-hidden="true" /></button>
          <button type="button" className="nav-toggle" ref={mobileToggleRef} aria-expanded={mobileMenuOpen} aria-controls="main-navigation" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => { setMobileMenuOpen((value) => !value); setActiveDropdown(null); setPinnedDropdown(null) }}>
            <i className={mobileMenuOpen ? 'fas fa-xmark' : 'fas fa-bars'} aria-hidden="true" />
          </button>
        </div>
      </div>
      {mobileMenuOpen && <div className="nav-backdrop" aria-hidden="true" onClick={() => { closeMenus(); mobileToggleRef.current?.focus() }} />}
    </header>
  )
}
