import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
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

  // Private screen: keep it out of every search index.
  useDocumentMeta({ title: 'Admin sign in | G3B Education', robots: 'noindex,nofollow,noarchive' })

  if (!loading && user) {
    return <Navigate to={location.state?.from || adminPath()} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(form)
      navigate(location.state?.from || adminPath(), { replace: true })
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
          <div className="al-logo-mark">
            <span>G3B</span>
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
            <div className="al-logo-mark al-logo-mark--sm"><span>G3B</span></div>
          </div>

          <div className="al-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your G3B Education admin account</p>
          </div>

          {error && (
            <div className="al-error-banner" role="alert">
              <i className="fas fa-circle-exclamation" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="al-form">
            {/* Email */}
            <div className="al-field">
              <label htmlFor="admin-email">Email address</label>
              <div className="al-input-wrap">
                <i className="fas fa-envelope al-input-icon" aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
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
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="al-submit-btn"
              disabled={submitting}
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
