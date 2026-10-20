import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { parseApiError } from '../../api/client.js'
import { ADMIN_BASE, adminPath } from '../../config/adminRoute.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

/** Administrator sign-in screen — premium split-panel design. */
export default function AdminLogin() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const returnPath = typeof location.state?.from === 'string' && (location.state.from === ADMIN_BASE || location.state.from.startsWith(`${ADMIN_BASE}/`)) ? location.state.from : adminPath()

  // Private screen: keep it out of every search index.
  useDocumentMeta({ title: 'Admin sign in | G3B Education', robots: 'noindex,nofollow,noarchive' })

  if (!loading && user) {
    return <Navigate to={returnPath} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || loading) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.trim().length > 190) {
      setError('Enter a valid email address.')
      document.getElementById('admin-email')?.focus()
      return
    }
    if (!form.password || form.password.length > 128) {
      setError('Enter your password (up to 128 characters).')
      document.getElementById('admin-password')?.focus()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await login({ email: form.email.trim(), password: form.password })
      navigate(returnPath, { replace: true })
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="al-root">
      {/* ── Left brand panel ── */}
      <div className="al-brand" aria-hidden="true">
        {/* Floating decorative orbs */}
        <span className="al-orb al-orb-1" />
        <span className="al-orb al-orb-2" />
        <span className="al-orb al-orb-3" />

        <div className="al-brand-inner">
          {/* Logo mark */}
          <div className="al-logo-mark" style={{ background: '#ffffff', padding: '6px' }}>
            <img src="/logo.png" alt="G3B Education" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 className="al-brand-headline">
            Manage your<br />
            <span className="al-brand-accent">education platform</span>
          </h2>
          <p className="al-brand-sub">
            Oversee enquiries, content, SEO, and team activity — all from one powerful dashboard.
          </p>

          {/* Stats row */}
          <div className="al-stats">
            <div className="al-stat">
              <strong>15k+</strong>
              <span>Students</span>
            </div>
            <div className="al-stat-divider" />
            <div className="al-stat">
              <strong>98%</strong>
              <span>Visa Success</span>
            </div>
            <div className="al-stat-divider" />
            <div className="al-stat">
              <strong>500+</strong>
              <span>Universities</span>
            </div>
          </div>
        </div>

        {/* Bottom badge */}
        <div className="al-brand-badge">
          <i className="fas fa-shield-halved" />
          <span>Secured with JWT &amp; role-based access control</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="al-form-panel">
        <div className="al-form-inner">

          {/* Mobile logo (hidden on desktop) */}
          <div className="al-mobile-logo">
            <div className="al-logo-mark al-logo-mark--sm" style={{ background: '#ffffff', padding: '4px' }}>
              <img src="/logo.png" alt="G3B Education" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          <div className="al-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your G3B Education admin account</p>
          </div>

          {error && (
            <div id="admin-login-error" className="al-error-banner" role="alert">
              <i className="fas fa-circle-exclamation" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="al-form" aria-busy={submitting || loading}>
            {/* Email */}
            <div className="al-field">
              <label htmlFor="admin-email">Email address</label>
              <div className="al-input-wrap">
                <i className="fas fa-envelope al-input-icon" aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
                  maxLength={190}
                  disabled={submitting || loading}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  autoComplete="username"
                  placeholder="you@g3beducation.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="al-field">
              <div className="al-label-row">
                <label htmlFor="admin-password">Password</label>
                <Link to={adminPath('forgot-password')} className="al-forgot">
                  Forgot password?
                </Link>
              </div>
              <div className="al-input-wrap">
                <i className="fas fa-lock al-input-icon" aria-hidden="true" />
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  maxLength={128}
                  disabled={submitting || loading}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="al-toggle-pass"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  aria-pressed={showPass}
                  aria-controls="admin-password"
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="al-submit-btn"
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <i className="fas fa-right-to-bracket" aria-hidden="true" />
                  <span>Sign in to Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="al-back-link">
            <Link to="/">
              <i className="fas fa-arrow-left" aria-hidden="true" />
              Back to G3B Education website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
