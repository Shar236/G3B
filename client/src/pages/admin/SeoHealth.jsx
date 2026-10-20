import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchSeoHealth, runSeoAudit, updateSeoIssue } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const SEVERITIES = ['critical', 'warning', 'notice']
const STATUSES = ['open', 'fixed', 'ignored', 'awaiting_verification']

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

/** Page-by-page SEO health, built only from real automated checks. */
export default function SeoHealth() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [running, setRunning] = useState(false)
  const [filters, setFilters] = useState({ severity: '', status: '', search: '' })

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setHealth(await fetchSeoHealth())
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRunAudit = async () => {
    setRunning(true)
    setNotice(null)
    try {
      const result = await runSeoAudit()
      setHealth(result)
      setNotice({ type: 'success', message: `Audit finished: ${result.counts.total} finding(s) across ${result.audit?.pagesScanned ?? 0} page(s).` })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setRunning(false)
    }
  }

  const handleStatus = async (issue, status) => {
    try {
      const result = await updateSeoIssue(issue.id, status)
      setHealth(result)
      setNotice({ type: 'success', message: `Finding marked as ${status.replace('_', ' ')}.` })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const issues = useMemo(() => {
    const list = health?.issues || []
    const term = filters.search.trim().toLowerCase()
    return list.filter((issue) => {
      if (filters.severity && issue.severity !== filters.severity) return false
      if (filters.status && issue.status !== filters.status) return false
      if (term) {
        const haystack = `${issue.message} ${issue.pageRoute || ''} ${issue.assetFilename || ''} ${issue.checkKey}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [health, filters])

  if (loading) return <StateBlock variant="loading" title="Loading SEO health…" />
  if (error) return <StateBlock variant="error" title="Could not load SEO health" message={error.message} onRetry={load} />

  const counts = health?.counts || {}

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>
              <i className="fas fa-heart-pulse" aria-hidden="true" /> SEO health
            </h2>
            <p className="row-sub">
              Every figure below comes from an automated check against live content.
              {health?.audit ? ` Last audit: ${formatDate(health.audit.startedAt)}.` : ' No audit has been run yet.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleRunAudit} disabled={running}>
            {running ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Running…
              </>
            ) : (
              <>
                <i className="fas fa-play" aria-hidden="true" /> Run audit now
              </>
            )}
          </button>
        </div>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        <p className="hint">{health?.scoreFormula}</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="label">Overall health</div>
          <div className="value">{health?.score ?? 100}</div>
        </div>
        <div className="stat-card">
          <div className="label">Findings</div>
          <div className="value">{counts.total ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Critical</div>
          <div className="value">{counts.critical ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Warnings</div>
          <div className="value">{counts.warning ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Notices</div>
          <div className="value">{counts.notice ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Open</div>
          <div className="value">{counts.open ?? 0}</div>
        </div>
      </div>

      <div className="admin-card">
        <h2>
          <i className="fas fa-table-list" aria-hidden="true" /> Health by page
        </h2>
        {health?.pages?.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Route</th>
                  <th>Score</th>
                  <th>Critical</th>
                  <th>Warnings</th>
                  <th>Notices</th>
                </tr>
              </thead>
              <tbody>
                {health.pages.map((page) => (
                  <tr key={page.pageId ?? 'site'}>
                    <td>{page.name || 'Site-wide'}</td>
                    <td>
                      <code>{page.route || '—'}</code>
                    </td>
                    <td>{page.score}</td>
                    <td>{page.counts.critical}</td>
                    <td>{page.counts.warning}</td>
                    <td>{page.counts.notice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateBlock
            variant="empty"
            title="No findings recorded"
            message="Run an audit to check every published page, image and redirect."
          />
        )}
      </div>

      <div className="admin-card">
        <h2>
          <i className="fas fa-list-check" aria-hidden="true" /> Prioritised findings
        </h2>

        <div className="admin-toolbar">
          <input
            type="search"
            aria-label="Search findings"
            placeholder="Search findings…"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <select
            aria-label="Filter by severity"
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}
          >
            <option value="">All severities</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {issues.length === 0 ? (
          <StateBlock variant="empty" title="No findings match these filters" message="Adjust the filters or run a new audit." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Finding</th>
                  <th>Recommendation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <span className={`badge badge-${issue.severity === 'critical' ? 'disabled' : issue.severity === 'warning' ? 'contacted' : 'new'}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td>{issue.category}</td>
                    <td>
                      {issue.message}
                      {issue.isAutomated ? (
                        <span className="hint" style={{ display: 'block' }}>
                          verified by an automated check
                        </span>
                      ) : null}
                    </td>
                    <td>{issue.recommendation || '—'}</td>
                    <td>{issue.status.replace('_', ' ')}</td>
                    <td className="actions">
                      {issue.status !== 'fixed' ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleStatus(issue, 'fixed')}>
                          Mark fixed
                        </button>
                      ) : null}
                      {issue.status !== 'ignored' ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleStatus(issue, 'ignored')}>
                          Ignore
                        </button>
                      ) : null}
                      {issue.status !== 'open' ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleStatus(issue, 'open')}>
                          Reopen
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
