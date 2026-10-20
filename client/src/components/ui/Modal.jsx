import { useEffect } from 'react'

/** Accessible modal dialog used across the admin dashboard. */
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: size === 'lg' ? 860 : 640 }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  )
}

export default Modal
