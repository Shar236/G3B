import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminPath } from '../../config/adminRoute.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'
import { resourceConfigs } from './resourceConfigs.js'

const primaryNav = [
  { to: adminPath(), label: 'Dashboard', icon: 'fas fa-gauge-high', end: true },
  { to: adminPath('enquiries'), label: 'Enquiries (CRM)', icon: 'fas fa-inbox' },
]

const seoNav = [
  { to: adminPath('seo'), label: 'Pages & SEO', icon: 'fas fa-magnifying-glass-chart', end: true },
  { to: adminPath('seo/health'), label: 'SEO Health', icon: 'fas fa-heart-pulse' },
  { to: adminPath('redirects'), label: 'Redirect Manager', icon: 'fas fa-signs-post' },
  { to: adminPath('media'), label: 'Image Library', icon: 'fas fa-images' },
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
  const [menuOpen, setMenuOpen] = useState(false)

  // The entire dashboard is private: never let it into a search index.
  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const handleLogout = async () => {
    await logout()
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
      <aside className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="admin-brand">
          <span className="brand-mark" aria-hidden="true">
            <i className="fas fa-graduation-cap" />
          </span>
          G3B Admin
        </div>

        <nav aria-label="Admin navigation">
          {primaryNav.map(link)}

          <p className="admin-nav-heading">SEO &amp; Media</p>
          {seoNav.map(link)}

          <p className="admin-nav-heading">Website content</p>
          {Object.values(resourceConfigs).map((config) => link({ to: adminPath(config.route), label: config.label, icon: config.icon }))}

          <p className="admin-nav-heading">System</p>
          {systemNav.map(link)}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="who">
            {user?.name}
            <br />
            {user?.email}
          </p>
          <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={handleLogout}>
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
            onClick={() => setMenuOpen((value) => !value)}
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </button>
          <h2>G3B Education dashboard</h2>
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
