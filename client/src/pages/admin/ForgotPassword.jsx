import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

/** Request a password-recovery link for an administrator account. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Reset your password | G3B Education', robots: 'noindex,nofollow,noarchive' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setNotice(null)
    try {
      const data = await requestPasswordReset(email)
      setNotice({ type: 'success', message: data.message })
      setEmail('')
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Forgot your password?</h1>
        <p className="sub">
          Enter the email address of your administrator account and we will send a secure reset link if it exists.
        </p>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Sending…
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane" aria-hidden="true" /> Send reset link
              </>
            )}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: '0.85rem' }}>
          <Link to={adminPath('login')}>
            <i className="fas fa-arrow-left" aria-hidden="true" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
