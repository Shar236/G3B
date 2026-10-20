import { useCallback, useEffect, useState } from 'react'
import { listAuditActions, listAuditLogs } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/** Read-only audit trail of sensitive administrative changes. */
export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState(null)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filters, setFilters] = useState({ search: '', action: '', page: 1 })

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listAuditLogs({
        page: filters.page,
        perPage: 50,
        search: filters.search || undefined,
        action: filters.action || undefined,
      })
      setLogs(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listAuditActions()
      .then(setActions)
      .catch(() => setActions([]))
  }, [])

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>
            <i className="fas fa-clipboard-list" aria-hidden="true" /> Audit logs
          </h2>
          <p className="row-sub">
            Every sensitive change is recorded with the administrator, address and time it came from. Entries are
            read-only and are never edited from the dashboard.
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          type="search"
          aria-label="Search the audit log"
          placeholder="Search summaries, actions or users…"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
        />
        <select
          aria-label="Filter by action"
          value={filters.action}
          onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value, page: 1 }))}
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <StateBlock variant="loading" title="Loading audit logs…" />
      ) : error ? (
        <StateBlock variant="error" title="Could not load audit logs" message={error.message} onRetry={load} />
      ) : logs.length === 0 ? (
        <StateBlock variant="empty" title="No activity recorded" message="Administrative changes will appear here." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Administrator</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Summary</th>
                  <th>Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.userEmail || '—'}</td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ''}
                    </td>
                    <td>{log.summary || '—'}</td>
                    <td>{log.ipAddress || '—'}</td>
                    <td className="actions">
                      {log.changes ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        >
                          {expanded === log.id ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expanded ? (
            <div className="admin-card" style={{ marginTop: 16, background: '#f8fafc' }}>
              <h3>Recorded changes</h3>
              <pre style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(logs.find((log) => log.id === expanded)?.changes ?? null, null, 2)}
              </pre>
            </div>
          ) : null}

          {pagination && pagination.totalPages > 1 ? (
            <div className="pagination">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
