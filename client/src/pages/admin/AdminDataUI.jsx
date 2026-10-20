import { Modal } from '../../components/ui/Modal.jsx'
import './adminEnhancements.css'

export function AdminNotice({ notice }) {
  return notice ? <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.message}</p> : null
}

export function TableSkeleton({ columns = 7, rows = 6 }) {
  return <div className="admin-data-skeleton" role="status" aria-label="Loading records" aria-busy="true">
    {Array.from({ length: rows }, (_, row) => <div className="admin-data-skeleton-row" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))` }}>
      {Array.from({ length: columns }, (_, col) => <span key={col} />)}
    </div>)}
    <span className="admin-sr-only">Loading records…</span>
  </div>
}

export function AdminPagination({ pagination, disabled, onPage }) {
  return <div className="pagination" aria-label="Table pagination">
    <span>Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} records</span>
    <button type="button" disabled={disabled || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button>
    <button type="button" disabled={disabled || pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Next</button>
  </div>
}

export function ConfirmAction({ action, busy, onClose, onConfirm }) {
  if (!action) return null
  return <Modal title={action.title || 'Confirm deletion'} onClose={busy ? undefined : onClose} footer={<>
    <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
    <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Confirm deletion'}</button>
  </>}><p>{action.message}</p><p className="row-sub">This action cannot be undone.</p></Modal>
}

export const displayDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString() : '—'
export const labelFor = (value) => String(value || '—').replaceAll('_', ' ')
export const LEAD_STATUSES = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed', 'archived']
