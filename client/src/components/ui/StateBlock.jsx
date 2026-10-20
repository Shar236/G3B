/** Shared loading / empty / error presentation. */
export function StateBlock({ variant = 'loading', title, message, onRetry, children }) {
  const icons = {
    loading: null,
    empty: 'far fa-folder-open',
    error: 'fas fa-triangle-exclamation',
  }

  return (
    <div className={`state-block ${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {variant === 'loading' ? <div className="spinner" /> : <i className={icons[variant]} aria-hidden="true" />}
      {title ? <h3>{title}</h3> : null}
      {message ? <p>{message}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <i className="fas fa-rotate-right" aria-hidden="true" /> Try again
        </button>
      ) : null}
      {children}
    </div>
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export default StateBlock
