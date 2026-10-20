import { Link } from 'react-router-dom'
import useDocumentMeta from '../hooks/useDocumentMeta.js'

export default function NotFound() {
  useDocumentMeta({ title: 'Page not found | G3B Education' })

  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', maxWidth: 620 }}>
        <p style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'Poppins, sans-serif' }}>404</p>
        <h1 className="section-title" style={{ display: 'inline-block' }}>
          Page not found
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '24px 0 28px' }}>
          The page you are looking for may have been moved or no longer exists. Explore our services or get in touch with a
          counsellor.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/">
            <i className="fas fa-house" aria-hidden="true" /> Back to homepage
          </Link>
          <Link className="btn btn-secondary" to="/#contact">
            <i className="fas fa-paper-plane" aria-hidden="true" /> Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
