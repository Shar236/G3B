import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminPath } from '../../config/adminRoute.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import { resourceConfigs } from './resourceConfigs.js'
import ErrorBoundary from '../../components/ui/ErrorBoundary.jsx'
import { notify } from '../../api/notifications.js'
import { parseApiError } from '../../api/client.js'

const primaryNav = [
  { to: adminPath(), label: 'Dashboard', icon: 'fas fa-gauge-high', end: true },
  { to: adminPath('enquiries'), label: 'Enquiries (CRM)', icon: 'fas fa-inbox' },
  { to: adminPath('partner-enquiries'), label: 'Partner Enquiries', icon: 'fas fa-handshake' },
  { to: adminPath('enquiries/school'), label: 'Grade 9+ & Workshops', icon: 'fas fa-school' },
  { to: adminPath('subscribers'), label: 'Newsletter subscribers', icon: 'fas fa-envelope-open-text' },
  { to: adminPath('assessment-assignments'), label: 'Assessment requests', icon: 'fas fa-clipboard-check' },
  { to: adminPath('learning'), label: 'Assignments & documents', icon: 'fas fa-file-pdf' },
]

const seoNav = [
  { to: adminPath('seo'), label: 'Pages & SEO', icon: 'fas fa-magnifying-glass-chart', end: true },
  { to: adminPath('seo/health'), label: 'SEO Health', icon: 'fas fa-heart-pulse' },
  { to: adminPath('redirects'), label: 'Redirect Manager', icon: 'fas fa-signs-post' },
  { to: adminPath('media'), label: 'Image Library', icon: 'fas fa-images' },
  { to: adminPath('media-gallery'), label: 'Media Gallery Manager', icon: 'fas fa-photo-film' },
]

const systemNav = [
  { to: adminPath('integrations'), label: 'Analytics & Search', icon: 'fas fa-plug' },
  { to: adminPath('homepage-content'), label: 'Homepage content', icon: 'fas fa-pen-to-square' },
  { to: adminPath('settings'), label: 'Site settings', icon: 'fas fa-gear' },
  { to: adminPath('users'), label: 'Users & roles', icon: 'fas fa-users' },
  { to: adminPath('audit-logs'), label: 'Audit logs', icon: 'fas fa-clipboard-list' },
]

/** Authenticated admin shell: sidebar navigation, top bar and content outlet. */
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const canManageLeads = ['admin', 'staff', 'counsellor'].includes(user?.role)
  const canManageContent = ['admin', 'editor'].includes(user?.role)
  const visibleSystemNav = systemNav.filter((item) => user?.role === 'admin' || (canManageContent && item.to === adminPath('homepage-content')))

  // The entire dashboard is private: never let it into a search index.
  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const handleLogout = async () => {
    setSigningOut(true)
    try { await logout() }
    catch (cause) { notify({ type: 'error', message: parseApiError(cause).message }) }
    finally { setSigningOut(false) }
    navigate(adminPath('login'), { replace: true })
  }

  const link = ({ to, label, icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
      onClick={() => setMenuOpen(false)}
    >
      <i className={icon} aria-hidden="true" />
      {label}
    </NavLink>
  )

  return (
    <div className="admin-shell">
      <aside id="admin-sidebar" className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="admin-brand">
          <img
            src="/logo.png"
            alt="G3B Admin"
            className="admin-brand-logo"
          />
          <span>G3B Admin</span>
        </div>

        <nav aria-label="Admin navigation">
          {canManageLeads ? primaryNav.map(link) : null}

          {canManageContent ? <><p className="admin-nav-heading">SEO &amp; Media</p>{seoNav.map(link)}</> : null}

          {canManageContent ? <><p className="admin-nav-heading">Website content</p>{Object.values(resourceConfigs).map((config) => link({ to: adminPath(config.route), label: config.label, icon: config.icon }))}</> : null}

          {visibleSystemNav.length ? <><p className="admin-nav-heading">System</p>{visibleSystemNav.map(link)}</> : null}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="who">
            {user?.name}
            <br />
            {user?.email}
          </p>
          <button type="button" className="btn btn-ghost btn-sm btn-block" disabled={signingOut} onClick={handleLogout}>
            <i className="fas fa-right-from-bracket" aria-hidden="true" /> Sign out
          </button>
          <p style={{ marginTop: 10 }}>
            <Link to="/">
              <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /> View website
            </Link>
          </p>
        </div>
      </aside>

      {menuOpen ? <div className="admin-sidebar-backdrop" onClick={() => setMenuOpen(false)} role="presentation" /> : null}

      <div className="admin-main">
        <div className="admin-topbar">
          <button
            type="button"
            className="admin-sidebar-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </button>
          <h2>G3B Education dashboard</h2>
        </div>

        <div className="admin-content">
          <ErrorBoundary resetKey={location.pathname}><Outlet /></ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
