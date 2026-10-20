import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

const DEFAULT_NAV = [
  { label: 'Why G3B', url: '/#why' },
  { label: 'Our Services', url: '/services' },
  { label: 'Destinations', url: '/#destinations' },
  { label: 'Pathways', url: '/#pathways' },
  { label: 'Reviews', url: '/#reviews' },
  { label: 'Insights', url: '/insights' },
  { label: 'Contact', url: '/#contact' },
]

/** Sticky site header: dynamic brand, dynamic navigation and accessible modal booking CTA. */
export default function Header({ settings = {}, navigation = [] }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const onHome = location.pathname === '/'
  const { openModal } = useCounsellingModal()

  const brand = settings.brand_name || 'G3B Education'
  const subheading = settings.header_subheading || 'Career Guidance · Study Abroad'
  const ctaLabel = settings.header_cta_label || 'Free Counselling'
  const logoUrl = settings.header_logo_url ? resolveMediaUrl(settings.header_logo_url) : '/logo.png'

  const navItems = navigation && navigation.length > 0 ? navigation : DEFAULT_NAV

  const handleNavClick = (item, e) => {
    setOpen(false)
    if (item.url === '#contact' || item.url === '/#contact') {
      if (onHome) {
        const contactSection = document.getElementById('contact')
        if (contactSection) {
          e.preventDefault()
          contactSection.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }

  const handleCtaClick = (e) => {
    e.preventDefault()
    setOpen(false)
    // If the setting is a specific external URL, navigate there; otherwise open the modal dialog
    if (settings.header_cta_url && settings.header_cta_url.startsWith('http')) {
      window.open(settings.header_cta_url, '_blank', 'noopener,noreferrer')
    } else {
      openModal()
    }
  }

  return (
    <header className="g3b-site-header">
      <div className="container g3b-header-inner">
        <Link className="g3b-brand" to="/" aria-label={`${brand} home`}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brand}
              className="brand-logo-img"
            />
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

        <nav className={`g3b-navigation${open ? ' open' : ''}`} aria-label="Primary navigation">
          <div className="g3b-menu">
            {navItems.map((item, idx) => {
              const isExternal = item.url.startsWith('http')
              const isInternalRoute = item.url.startsWith('/') && !item.url.startsWith('/#')

              if (isExternal) {
                return (
                  <a
                    key={item.id || idx}
                    href={item.url}
                    target={item.openNewTab ? '_blank' : '_self'}
                    rel={item.openNewTab ? 'noopener noreferrer' : undefined}
                    className={item.isButton ? 'nav-cta-btn' : ''}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              }

              if (isInternalRoute) {
                return (
                  <Link
                    key={item.id || idx}
                    to={item.url}
                    className={item.isButton ? 'nav-cta-btn' : ''}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              }

              // Anchor links such as /#why or #why
              const hashOnly = item.url.includes('#') ? item.url.slice(item.url.indexOf('#')) : item.url
              const targetUrl = onHome ? hashOnly : `/${hashOnly}`

              return (
                <a
                  key={item.id || idx}
                  href={targetUrl}
                  className={item.isButton ? 'nav-cta-btn' : ''}
                  onClick={(e) => handleNavClick(item, e)}
                >
                  {item.label}
                </a>
              )
            })}
          </div>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm header-counselling-cta"
            onClick={handleCtaClick}
            aria-label="Book Free Counselling Session"
          >
            <i className="fas fa-paper-plane" aria-hidden="true" /> {ctaLabel}
          </button>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <i className={open ? 'fas fa-xmark' : 'fas fa-bars'} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
