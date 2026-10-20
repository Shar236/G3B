import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

/** Complete a password reset using the single-use token from the email link. */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Choose a new password | G3B Education', robots: 'noindex,nofollow,noarchive' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password !== form.confirm) {
      setNotice({ type: 'error', message: 'The two passwords do not match.' })
      return
    }
    setSubmitting(true)
    setNotice(null)
    try {
      const data = await confirmPasswordReset(token, form.password)
      setNotice({ type: 'success', message: data.message })
      setForm({ password: '', confirm: '' })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSubmitting(false)
    }
  }

  // Without a token there is nothing to reset: explain rather than fail silently.
  if (!token) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>Reset link required</h1>
          <p className="sub">This page needs a valid recovery link. Request a new one to continue.</p>
          <Link className="btn btn-primary btn-block" to={adminPath('forgot-password')}>
            <i className="fas fa-paper-plane" aria-hidden="true" /> Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const done = notice?.type === 'success'

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Choose a new password</h1>
        <p className="sub">Use at least 8 characters. The reset link can only be used once.</p>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        {done ? (
          <Link className="btn btn-primary btn-block" to={adminPath('login')}>
            <i className="fas fa-right-to-bracket" aria-hidden="true" /> Go to sign in
          </Link>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirm}
                onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-key" aria-hidden="true" /> Set new password
                </>
              )}
            </button>
          </form>
        )}

        <p style={{ marginTop: 18, fontSize: '0.85rem' }}>
          <Link to={adminPath('login')}>
            <i className="fas fa-arrow-left" aria-hidden="true" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
