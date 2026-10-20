import { useCallback, useEffect, useState } from 'react'
import { checkIntegration, listIntegrations, updateIntegration } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

/** Friendly labels for the non-secret configuration keys each provider accepts. */
const CONFIG_LABELS = {
  siteUrl: 'Search Console property URL',
  propertyId: 'GA4 property ID',
  defaultUrl: 'Default URL to audit',
}

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

const statusBadge = (status) => {
  if (status === 'connected') return 'active'
  if (status === 'error') return 'disabled'
  return 'contacted'
}

/**
 * Google Search Console, GA4 and PageSpeed Insights connections.
 *
 * Credentials live only in the backend environment. When they are absent the
 * provider is reported as disconnected and no metrics are invented.
 */
export default function Integrations() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(null)
  const [results, setResults] = useState({})

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProviders(await listIntegrations())
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patchProvider = (provider, changes) =>
    setProviders((current) => current.map((item) => (item.provider === provider ? { ...item, ...changes } : item)))

  const handleSave = async (provider) => {
    setBusy(`${provider.provider}:save`)
    setNotice(null)
    try {
      const updated = await updateIntegration(provider.provider, {
        isEnabled: provider.isEnabled,
        config: provider.config || {},
      })
      patchProvider(provider.provider, updated)
      setNotice({
        type: 'success',
        message:
          updated.status === 'connected'
            ? `${updated.label} settings saved.`
            : `${updated.label} settings saved. It stays disconnected until its environment variables are set.`,
      })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setBusy(null)
    }
  }

  const handleCheck = async (provider) => {
    setBusy(`${provider.provider}:check`)
    setNotice(null)
    try {
      const result = await checkIntegration(provider.provider, provider.config?.defaultUrl)
      patchProvider(provider.provider, result)
      setResults((current) => ({ ...current, [provider.provider]: result }))
      setNotice({ type: result.reachable ? 'success' : 'error', message: result.message })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <StateBlock variant="loading" title="Loading integrations…" />
  if (error) return <StateBlock variant="error" title="Could not load integrations" message={error.message} onRetry={load} />

  return (
    <>
      <div className="admin-card">
        <h2>
          <i className="fas fa-plug" aria-hidden="true" /> Analytics &amp; Search connections
        </h2>
        <p className="row-sub">
          Credentials are read from backend environment variables only and are never stored in the database or sent to the
          browser. Nothing here is simulated: a provider stays disconnected until its credentials exist.
        </p>
        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}
      </div>

      {providers.map((provider) => {
        const result = results[provider.provider]
        return (
          <div className="admin-card" key={provider.provider}>
            <div className="admin-card-head">
              <div>
                <h2>
                  <i className="fas fa-chart-line" aria-hidden="true" /> {provider.label}
                </h2>
                <p className="row-sub">
                  <span className={`badge badge-${statusBadge(provider.status)}`}>{provider.status}</span>{' '}
                  Data source: {provider.dataSource}
                  {provider.lastSyncedAt ? ` · last synced ${formatDate(provider.lastSyncedAt)}` : ''}
                </p>
              </div>
              <label className="admin-checkbox" htmlFor={`enabled-${provider.provider}`}>
                <input
                  id={`enabled-${provider.provider}`}
                  type="checkbox"
                  checked={Boolean(provider.isEnabled)}
                  onChange={(event) => patchProvider(provider.provider, { isEnabled: event.target.checked })}
                />
                Enabled
              </label>
            </div>

            <p className="row-sub">
              Available metrics: {provider.capabilities.join(', ')}.
            </p>

            {!provider.credentialsConfigured ? (
              <p className="form-notice plain error" role="status">
                <span>Missing environment variables: {provider.missingEnvKeys.join(', ')}</span>
              </p>
            ) : null}

            {!provider.apiImplemented ? (
              <p className="form-notice plain error" role="status">
                <span>
                  Live data sync is not enabled for this provider in the current build, so no metrics are shown. Follow the
                  setup steps below.
                </span>
              </p>
            ) : null}

            <div className="admin-grid-2">
              {provider.supportedConfigKeys.map((key) => (
                <div className="admin-field" key={key}>
                  <label htmlFor={`${provider.provider}-${key}`}>{CONFIG_LABELS[key] || key}</label>
                  <input
                    id={`${provider.provider}-${key}`}
                    className="admin-input"
                    value={provider.config?.[key] ?? ''}
                    onChange={(event) =>
                      patchProvider(provider.provider, { config: { ...(provider.config || {}), [key]: event.target.value } })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="admin-field">
              <label>Setup steps</label>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {provider.setupInstructions.map((step) => (
                  <li key={step} className="row-sub">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {provider.lastError ? (
              <p className="form-notice plain error" role="status">
                <span>Last error: {provider.lastError}</span>
              </p>
            ) : null}

            {result?.report ? (
              <div className="admin-field">
                <label>
                  Latest PageSpeed report for {result.report.finalUrl} ({result.report.strategy})
                </label>
                <div className="stat-cards" style={{ marginBottom: 12 }}>
                  {Object.entries(result.report.scores).map(([name, score]) => (
                    <div className="stat-card" key={name}>
                      <div className="label">{name.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="value">{score}</div>
                    </div>
                  ))}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {Object.entries(result.report.metrics).map(([name, value]) => (
                    <li key={name} className="row-sub">
                      {name.replace(/([A-Z])/g, ' $1')}: {value ?? '—'}
                    </li>
                  ))}
                </ul>
                <p className="hint">Fetched {formatDate(result.report.fetchedAt)} directly from the PageSpeed Insights API.</p>
              </div>
            ) : null}

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSave(provider)}
                disabled={busy === `${provider.provider}:save`}
              >
                {busy === `${provider.provider}:save` ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleCheck(provider)}
                disabled={busy === `${provider.provider}:check`}
              >
                {busy === `${provider.provider}:check` ? 'Checking…' : 'Test connection'}
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}
