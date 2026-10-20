import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bulkSubscribers, createSubscriber, deleteSubscriber, downloadSubscribersCsv, updateSubscriber } from '../../api/leadAdminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { AdminNotice, AdminPagination, ConfirmAction, displayDate, TableSkeleton } from './AdminDataUI.jsx'
import useAdminCollection, { useDebouncedValue } from './useAdminCollection.js'

const defaults = { search: '', status: '', source: '', dateFrom: '', dateTo: '', sortBy: 'createdAt', sortDir: 'desc', page: 1, perPage: 20 }
const endpoint = '/api/admin/subscribers'
const emptyForm = { email: '', phone: '', source: 'newsletter', status: 'active', consent: false }

export default function Subscribers() {
  const { user } = useAuth()
  const canDelete = user?.role === 'admin'
  const [filters, setFilters] = useState(defaults)
  const search = useDebouncedValue(filters.search)
  const params = Object.fromEntries(Object.entries({ ...filters, search }).filter(([, value]) => value !== ''))
  const { items, setItems, pagination, loading, error, reload } = useAdminCollection(endpoint, params)
  const [selected, setSelected] = useState([])
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const visibleSelection = selected.filter((id) => items.some((item) => item.id === id))

  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }))
    setSelected([])
  }
  const reset = () => { setFilters(defaults); setSelected([]) }
  const openEditor = (record) => {
    setEditing(record || { id: null })
    setForm(record ? { email: record.email, phone: record.phone || '', source: record.source, status: record.status, consent: Boolean(record.consentAt) } : emptyForm)
    setFormError(null)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const previous = items
    const payload = { email: form.email.trim(), phone: form.phone.trim() || null, source: form.source, status: form.status }
    setSaving(true)
    setFormError(null)
    if (editing.id) setItems((current) => current.map((item) => item.id === editing.id ? { ...item, ...payload } : item))
    try {
      if (editing.id) await updateSubscriber(editing.id, payload)
      else await createSubscriber({ ...payload, consent: form.consent })
      setNotice({ type: 'success', message: editing.id ? 'Subscriber updated.' : 'Subscriber created.' })
      setEditing(null)
      reload()
    } catch (cause) {
      setItems(previous)
      setFormError(parseApiError(cause).message)
    } finally { setSaving(false) }
  }

  const setStatus = async (ids, status) => {
    if (busy || !ids.length) return
    const previous = items
    setBusy(true)
    setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, status } : item))
    try {
      if (ids.length === 1) await updateSubscriber(ids[0], { status })
      else await bulkSubscribers({ ids, action: status === 'active' ? 'activate' : 'unsubscribe' })
      setNotice({ type: 'success', message: `${ids.length} ${ids.length === 1 ? 'subscriber' : 'subscribers'} updated.` })
      setSelected([])
      reload()
    } catch (cause) {
      setItems(previous)
      setNotice({ type: 'error', message: `${parseApiError(cause).message} The previous statuses have been restored.` })
    } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    const ids = confirmation.ids
    const previous = items
    setBusy(true)
    setItems((current) => current.filter((item) => !ids.includes(item.id)))
    try {
      if (ids.length === 1) await deleteSubscriber(ids[0])
      else await bulkSubscribers({ ids, action: 'delete' })
      setSelected([])
      setNotice({ type: 'success', message: `${ids.length} ${ids.length === 1 ? 'subscriber' : 'subscribers'} deleted.` })
      if (items.length === ids.length && filters.page > 1) changeFilter('page', filters.page - 1)
      reload()
    } catch (cause) {
      setItems(previous)
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally { setBusy(false); setConfirmation(null) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const exportFilters = { ...params }
      delete exportFilters.page
      delete exportFilters.perPage
      await downloadSubscribersCsv(exportFilters)
      setNotice({ type: 'success', message: 'All subscribers matching these filters were exported.' })
    } catch (cause) { setNotice({ type: 'error', message: parseApiError(cause).message }) }
    finally { setExporting(false) }
  }

  return <div className="admin-card">
    <div className="admin-card-head"><div><h2><i className="fas fa-envelope" aria-hidden="true" /> Newsletter & guide subscribers</h2><p className="row-sub">Manage subscription preferences and resource-download leads.</p></div><div className="admin-action-group"><button type="button" className="btn btn-secondary btn-sm" disabled={exporting || loading} onClick={handleExport}>{exporting ? 'Exporting…' : 'Export filtered CSV'}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => openEditor(null)}>Add subscriber</button></div></div>
    <div className="admin-inbox-links"><Link className="btn btn-ghost btn-sm" to={adminPath('enquiries')}>Enquiries & leads</Link><Link className="btn btn-ghost btn-sm" to={adminPath('enquiries/school')}>School & Grade 9+ inbox</Link></div>
    <AdminNotice notice={notice} />
    <fieldset className="admin-filter-grid" disabled={busy} aria-label="Filter subscribers">
      <div className="admin-field"><label htmlFor="subscriber-search">Search email or phone</label><input id="subscriber-search" className="admin-input" type="search" maxLength={200} value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} /></div>
      <div className="admin-field"><label htmlFor="subscriber-status">Status</label><select id="subscriber-status" className="admin-select" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option></select></div>
      <div className="admin-field"><label htmlFor="subscriber-source">Source</label><select id="subscriber-source" className="admin-select" value={filters.source} onChange={(event) => changeFilter('source', event.target.value)}><option value="">All sources</option><option value="newsletter">Newsletter</option><option value="guide">Guide PDF download</option></select></div>
      <div className="admin-field"><label htmlFor="subscriber-sort">Sort by</label><select id="subscriber-sort" className="admin-select" value={filters.sortBy} onChange={(event) => changeFilter('sortBy', event.target.value)}><option value="createdAt">Subscription date</option><option value="email">Email</option><option value="status">Status</option></select></div>
      <div className="admin-field"><label htmlFor="subscriber-from">Subscribed from</label><input id="subscriber-from" className="admin-input" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => changeFilter('dateFrom', event.target.value)} /></div>
      <div className="admin-field"><label htmlFor="subscriber-to">Subscribed through</label><input id="subscriber-to" className="admin-input" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => changeFilter('dateTo', event.target.value)} /></div>
      <div className="admin-field"><label htmlFor="subscriber-direction">Order</label><select id="subscriber-direction" className="admin-select" value={filters.sortDir} onChange={(event) => changeFilter('sortDir', event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
      <div className="admin-field"><label htmlFor="subscriber-per-page">Rows per page</label><select id="subscriber-per-page" className="admin-select" value={filters.perPage} onChange={(event) => changeFilter('perPage', Number(event.target.value))}>{[20, 50, 100].map((count) => <option key={count}>{count}</option>)}</select></div>
    </fieldset>
    <div className="admin-inbox-links"><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={reset}>Reset filters</button><button type="button" className="btn btn-ghost btn-sm" disabled={loading || busy} onClick={() => { setSelected([]); reload() }}>Refresh</button></div>
    {visibleSelection.length && !loading ? <div className="admin-bulk-bar" role="region" aria-label="Selected subscriber actions"><strong>{visibleSelection.length} selected</strong><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus(visibleSelection, 'active')}>Set active</button><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus(visibleSelection, 'unsubscribed')}>Unsubscribe</button>{canDelete ? <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ ids: visibleSelection, message: `Delete ${visibleSelection.length} selected subscriber records?` })}>Delete selected</button> : null}<button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setSelected([])}>Clear selection</button></div> : null}
    {loading ? <TableSkeleton columns={6} /> : error ? <StateBlock variant="error" title="Could not load subscribers" message={error.message} onRetry={reload} /> : !items.length ? <StateBlock variant="empty" title="No subscribers found for this filter" message="Reset filters or add a subscriber who has given permission."><button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Reset filters</button></StateBlock> : <>
      <div className="table-wrap admin-data-table" tabIndex={0} role="region" aria-label="Subscribers table; scroll horizontally to see all columns"><table className="admin-table"><thead><tr><th className="admin-check-cell"><input type="checkbox" aria-label="Select all subscribers on this page" checked={visibleSelection.length === items.length} disabled={busy} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /></th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Source trigger</th><th scope="col">Status</th><th scope="col">Consent recorded</th><th scope="col">Subscribed</th><th scope="col">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="admin-check-cell"><input type="checkbox" checked={visibleSelection.includes(item.id)} disabled={busy} aria-label={`Select ${item.email}`} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></td><td>{item.email}</td><td>{item.phone || '—'}</td><td>{item.source === 'guide' ? 'Guide PDF download' : 'Newsletter'}</td><td><select aria-label={`Subscription status for ${item.email}`} value={item.status} disabled={busy} onChange={(event) => setStatus([item.id], event.target.value)}><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option></select></td><td>{displayDate(item.consentAt)}</td><td>{displayDate(item.createdAt)}</td><td><div className="admin-action-group"><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => openEditor(item)}>Edit</button>{canDelete ? <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ ids: [item.id], message: `Delete the subscriber record for ${item.email}?` })}>Delete</button> : null}</div></td></tr>)}</tbody></table></div>
      <AdminPagination pagination={pagination} disabled={busy} onPage={(page) => changeFilter('page', page)} />
    </>}
    <ConfirmAction action={confirmation} busy={busy} onClose={() => setConfirmation(null)} onConfirm={handleDelete} />
    {editing ? <Modal title={editing.id ? 'Edit subscriber' : 'Add subscriber'} onClose={saving ? undefined : () => setEditing(null)} footer={<><button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="subscriber-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save subscriber'}</button></>}>
      <AdminNotice notice={formError ? { type: 'error', message: formError } : null} />
      <form id="subscriber-form" onSubmit={handleSave}>
        <div className="admin-field"><label htmlFor="subscriber-form-email">Email *</label><input id="subscriber-form-email" className="admin-input" type="email" required maxLength={190} disabled={saving} autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
        <div className="admin-field"><label htmlFor="subscriber-form-phone">Phone with country code (optional)</label><input id="subscriber-form-phone" className="admin-input" type="tel" pattern="[+]?[0-9][0-9\s\(\)\-]{6,19}" maxLength={21} disabled={saving} autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
        <div className="admin-grid-2"><div className="admin-field"><label htmlFor="subscriber-form-source">Source</label><select id="subscriber-form-source" className="admin-select" value={form.source} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}><option value="newsletter">Newsletter</option><option value="guide">Guide PDF download</option></select></div><div className="admin-field"><label htmlFor="subscriber-form-status">Status</label><select id="subscriber-form-status" className="admin-select" value={form.status} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option></select></div></div>
        {!editing.id ? <label className="admin-checkbox"><input type="checkbox" required checked={form.consent} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />I have recorded this person's permission to subscribe.</label> : <p className="row-sub">Consent recorded: {displayDate(editing.consentAt)}. Changes preserve the original consent record.</p>}
      </form>
    </Modal> : null}
  </div>
}
