import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEnquiryStats } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'

const STATUS_ORDER = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed']

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/** Admin summary: enquiry counts, last 7 days and the most recent submissions. */
export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await fetchEnquiryStats())
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <StateBlock variant="loading" title="Loading dashboard…" />
  if (error) return <StateBlock variant="error" title="Could not load the dashboard" message={error.message} onRetry={load} />

  const counts = stats?.counts || {}

  return (
    <>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="label">Total enquiries</div>
          <div className="value">{counts.total ?? 0}</div>
        </div>
        {STATUS_ORDER.map((status) => (
          <div className="stat-card" key={status}>
            <div className="label">{status.replace('_', ' ')}</div>
            <div className="value">{counts[status] ?? 0}</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="label">Last 7 days</div>
          <div className="value">{stats?.last7Days ?? 0}</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2>
            <i className="fas fa-clock-rotate-left" aria-hidden="true" /> Recent submissions
          </h2>
          <Link className="btn btn-ghost btn-sm" to={adminPath('enquiries')}>
            View all enquiries
          </Link>
        </div>

        {stats?.recent?.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Interested in</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>
                      <Link to={adminPath(`enquiries/${enquiry.id}`)}>{enquiry.fullName}</Link>
                    </td>
                    <td>{enquiry.email}</td>
                    <td>{enquiry.serviceInterest}</td>
                    <td>
                      <span className={`badge badge-${enquiry.status}`}>{enquiry.status.replace('_', ' ')}</span>
                    </td>
                    <td>{formatDate(enquiry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateBlock variant="empty" title="No enquiries yet" message="New website enquiries will appear here." />
        )}
      </div>
    </>
  )
}
