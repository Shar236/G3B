import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteEnquiry, downloadEnquiriesCsv, listEnquiries } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'

const STATUSES = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed']

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/** Searchable, filterable and paginated enquiry list with CSV export. */
export default function Enquiries() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listEnquiries({
        page: filters.page,
        status: filters.status || undefined,
        search: filters.search || undefined,
      })
      setItems(response.data)
      setPagination(response.pagination)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (enquiry) => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.fullName}? This cannot be undone.`)) return
    try {
      await deleteEnquiry(enquiry.id)
      setNotice({ type: 'success', message: 'Enquiry deleted.' })
      load()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleExport = async () => {
    try {
      await downloadEnquiriesCsv({ status: filters.status || undefined, search: filters.search || undefined })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <h2>
          <i className="fas fa-inbox" aria-hidden="true" /> Enquiries
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
          <i className="fas fa-file-csv" aria-hidden="true" /> Export CSV
        </button>
      </div>

      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
        </p>
      ) : null}

      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Search name, email, phone or message"
          aria-label="Search enquiries"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
        />
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
          <i className="fas fa-rotate-right" aria-hidden="true" /> Refresh
        </button>
      </div>

      {loading ? (
        <StateBlock variant="loading" title="Loading enquiries…" />
      ) : error ? (
        <StateBlock variant="error" title="Could not load enquiries" message={error.message} onRetry={load} />
      ) : items.length === 0 ? (
        <StateBlock variant="empty" title="No matching enquiries" message="Try adjusting your search or status filter." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Interested in</th>
                  <th>Status</th>
                  <th>Assigned to</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>
                      <Link to={adminPath(`enquiries/${enquiry.id}`)}>{enquiry.fullName}</Link>
                    </td>
                    <td>
                      <div className="row-sub">{enquiry.email}</div>
                      <div className="row-sub">{enquiry.phone}</div>
                    </td>
                    <td>{enquiry.serviceInterest}</td>
                    <td>
                      <span className={`badge badge-${enquiry.status}`}>{enquiry.status.replace('_', ' ')}</span>
                    </td>
                    <td>{enquiry.assignedToName || '—'}</td>
                    <td>{formatDate(enquiry.createdAt)}</td>
                    <td className="actions">
                      <Link className="btn btn-ghost btn-sm" to={adminPath(`enquiries/${enquiry.id}`)}>
                        View
                      </Link>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(enquiry)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} record
              {pagination.total === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
