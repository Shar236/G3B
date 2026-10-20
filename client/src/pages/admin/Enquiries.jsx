import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteEnquiry, downloadEnquiriesCsv, updateEnquiry } from '../../api/adminApi.js'
import { bulkEnquiries, createEnquiry } from '../../api/leadAdminApi.js'
import { parseApiError } from '../../api/client.js'
import { adminPath } from '../../config/adminRoute.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { AdminNotice, AdminPagination, ConfirmAction, displayDate, labelFor, LEAD_STATUSES, TableSkeleton } from './AdminDataUI.jsx'
import EnquiryForm, { emptyEnquiry, enquiryPayload } from './EnquiryForm.jsx'
import useAdminCollection, { useDebouncedValue } from './useAdminCollection.js'

const defaults = { search: '', status: '', service: '', destination: '', leadSource: '', dateFrom: '', dateTo: '', currentStatus: '', sortBy: 'createdAt', sortDir: 'desc', page: 1, perPage: 20 }
const endpoint = '/api/admin/enquiries'

/** Server-filtered CRM, including a dedicated school and workshop inbox. */
export default function Enquiries({ segment }) {
  const { user } = useAuth()
  const canDelete = user?.role === 'admin'
  const [filters, setFilters] = useState(defaults)
  const search = useDebouncedValue(filters.search)
  const params = Object.fromEntries(Object.entries({ ...filters, search, segment }).filter(([, value]) => value !== '' && value !== undefined))
  const { items, setItems, pagination, loading, error, reload } = useAdminCollection(endpoint, params)
  const [selected, setSelected] = useState([])
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [bulkStatus, setBulkStatus] = useState('contacted')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyEnquiry)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const visibleSelection = selected.filter((id) => items.some((item) => item.id === id))

  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }))
    setSelected([])
  }
  const resetFilters = () => { setFilters(defaults); setSelected([]) }
  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])

  const updateStatus = async (ids, status) => {
    if (busy || !ids.length) return
    const previous = items
    setBusy(true)
    setNotice(null)
    setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, status } : item))
    try {
      if (ids.length === 1) await updateEnquiry(ids[0], { status })
      else await bulkEnquiries({ ids, action: 'status', status })
      setSelected([])
      setNotice({ type: 'success', message: `${ids.length === 1 ? 'Enquiry' : `${ids.length} enquiries`} updated.` })
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
      if (ids.length === 1) await deleteEnquiry(ids[0])
      else await bulkEnquiries({ ids, action: 'delete' })
      setConfirmation(null)
      setSelected([])
      setNotice({ type: 'success', message: `${ids.length} ${ids.length === 1 ? 'enquiry' : 'enquiries'} deleted.` })
      if (items.length === ids.length && filters.page > 1) changeFilter('page', filters.page - 1)
      reload()
    } catch (cause) {
      setItems(previous)
      setConfirmation(null)
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally { setBusy(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const exportFilters = { ...params }
      delete exportFilters.page
      delete exportFilters.perPage
      await downloadEnquiriesCsv(exportFilters)
      setNotice({ type: 'success', message: 'The CSV download includes all enquiries matching these filters.' })
    } catch (cause) { setNotice({ type: 'error', message: parseApiError(cause).message }) }
    finally { setExporting(false) }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await createEnquiry(enquiryPayload(form))
      setCreating(false)
      setNotice({ type: 'success', message: 'Enquiry created.' })
      reload()
    } catch (cause) { setFormError(parseApiError(cause).message) }
    finally { setSaving(false) }
  }

  const textFilter = (key, label, placeholder, type = 'text') => <div className="admin-field">
    <label htmlFor={`filter-${key}`}>{label}</label><input id={`filter-${key}`} className="admin-input" type={type} placeholder={placeholder} value={filters[key]} maxLength={key === 'search' ? 200 : 150} onChange={(event) => changeFilter(key, event.target.value)} />
  </div>

  return <div className="admin-card">
    <div className="admin-card-head">
      <div><h2><i className={segment === 'school' ? 'fas fa-school' : 'fas fa-inbox'} aria-hidden="true" /> {segment === 'school' ? 'Grade 9+ & school enquiries' : 'Enquiries & leads'}</h2><p className="row-sub">{segment === 'school' ? 'School profiling, stream selection and workshop requests.' : 'Consultations, pathway assessments and professional programmes.'}</p></div>
      <div className="admin-action-group"><button type="button" className="btn btn-secondary btn-sm" disabled={exporting || loading} onClick={handleExport}>{exporting ? 'Exporting…' : 'Export filtered CSV'}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => { setForm({ ...emptyEnquiry, ...(segment === 'school' ? { currentStatus: 'high_school', leadSource: 'grade9', serviceInterest: 'Grade 9+ Counselling' } : {}) }); setFormError(null); setCreating(true) }}>Add enquiry</button></div>
    </div>
    <div className="admin-inbox-links"><Link className="btn btn-ghost btn-sm" to={adminPath('enquiries')}>All enquiries</Link><Link className="btn btn-ghost btn-sm" to={adminPath('enquiries/school')}>School & Grade 9+ inbox</Link><Link className="btn btn-ghost btn-sm" to={adminPath('subscribers')}>Newsletter & guide subscribers</Link></div>
    <AdminNotice notice={notice} />
    <fieldset className="admin-filter-grid" disabled={busy} aria-label="Filter enquiries">
      {textFilter('search', 'Search leads', 'Name, email, phone or message', 'search')}
      <div className="admin-field"><label htmlFor="filter-status">Status</label><select id="filter-status" className="admin-select" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}</select></div>
      {textFilter('service', 'Service category', 'Any service')}
      {textFilter('destination', 'Preferred destination', 'Any destination')}
      <div className="admin-field"><label htmlFor="filter-leadSource">Source / funnel</label><select id="filter-leadSource" className="admin-select" value={filters.leadSource} onChange={(event) => changeFilter('leadSource', event.target.value)}><option value="">All sources</option><option value="site">Website (legacy)</option><option value="contact">Contact form</option><option value="consultation">Consultation booking</option><option value="university">University pathway</option><option value="insight">Insight article</option><option value="assessment">Pathway assessment</option><option value="grade9">Grade 9+ counselling</option><option value="workshop">Workshop</option><option value="professional">Working professional</option><option value="referral">Referral</option></select></div>
      <div className="admin-field"><label htmlFor="filter-currentStatus">Student / career stage</label><select id="filter-currentStatus" className="admin-select" value={filters.currentStatus} onChange={(event) => changeFilter('currentStatus', event.target.value)}><option value="">All stages</option><option value="high_school">High school</option><option value="college">College</option><option value="working">Working professional</option></select></div>
      <div className="admin-field"><label htmlFor="filter-dateFrom">Received from</label><input id="filter-dateFrom" className="admin-input" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => changeFilter('dateFrom', event.target.value)} /></div>
      <div className="admin-field"><label htmlFor="filter-dateTo">Received through</label><input id="filter-dateTo" className="admin-input" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => changeFilter('dateTo', event.target.value)} /></div>
      <div className="admin-field"><label htmlFor="filter-sortBy">Sort by</label><select id="filter-sortBy" className="admin-select" value={filters.sortBy} onChange={(event) => changeFilter('sortBy', event.target.value)}><option value="createdAt">Submission date</option><option value="updatedAt">Last update</option><option value="fullName">Name</option><option value="email">Email</option><option value="status">Status</option></select></div>
      <div className="admin-field"><label htmlFor="filter-sortDir">Order</label><select id="filter-sortDir" className="admin-select" value={filters.sortDir} onChange={(event) => changeFilter('sortDir', event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
      <div className="admin-field"><label htmlFor="filter-perPage">Rows per page</label><select id="filter-perPage" className="admin-select" value={filters.perPage} onChange={(event) => changeFilter('perPage', Number(event.target.value))}>{[20, 50, 100].map((count) => <option key={count}>{count}</option>)}</select></div>
      <div className="admin-action-group"><button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters} disabled={busy}>Reset filters</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelected([]); reload() }} disabled={loading || busy}>Refresh</button></div>
    </fieldset>
    {visibleSelection.length > 0 && !loading ? <div className="admin-bulk-bar" role="region" aria-label="Selected enquiry actions"><strong>{visibleSelection.length} selected</strong><select className="admin-select" value={bulkStatus} disabled={busy} onChange={(event) => setBulkStatus(event.target.value)} aria-label="Status for selected enquiries">{LEAD_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}</select><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => updateStatus(visibleSelection, bulkStatus)}>Apply status</button>{canDelete ? <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ ids: visibleSelection, message: `Delete ${visibleSelection.length} selected enquiries and their internal notes?` })}>Delete selected</button> : null}<button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setSelected([])}>Clear selection</button></div> : null}
    {loading ? <TableSkeleton columns={8} /> : error ? <StateBlock variant="error" title="Could not load enquiries" message={error.message} onRetry={reload} /> : !items.length ? <StateBlock variant="empty" title="No leads found for this filter" message="Reset the filters to see more enquiries."><button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Reset filters</button></StateBlock> : <>
      <div className="table-wrap admin-data-table" tabIndex={0} role="region" aria-label="Enquiries table; scroll horizontally to see all columns">
        <table className="admin-table"><thead><tr><th className="admin-check-cell"><input type="checkbox" checked={visibleSelection.length === items.length && items.length > 0} aria-label="Select all enquiries on this page" disabled={busy} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /></th><th scope="col">Name</th><th scope="col">Contact</th><th scope="col">Service</th><th scope="col">Destination</th><th scope="col">Source / stage</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
          <td className="admin-check-cell"><input type="checkbox" checked={visibleSelection.includes(item.id)} disabled={busy} onChange={() => toggleSelected(item.id)} aria-label={`Select enquiry from ${item.fullName}`} /></td><td><Link to={adminPath(`enquiries/${item.id}`)}>{item.fullName}</Link>{item.assignedToName ? <div className="row-sub">{item.assignedToName}</div> : null}</td><td><div>{item.email}</div><div className="row-sub">{item.countryCode && !item.phone?.startsWith('+') ? `${item.countryCode} ` : ''}{item.phone}</div></td><td>{item.serviceInterest}</td><td>{item.preferredDestination || '—'}</td><td><div>{labelFor(item.leadSource || item.source || 'site')}</div><div className="row-sub">{labelFor(item.currentStatus)}</div></td><td><select value={item.status} disabled={busy} aria-label={`Update status for ${item.fullName}`} onChange={(event) => updateStatus([item.id], event.target.value)}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}</select></td><td>{displayDate(item.createdAt)}</td><td><div className="admin-action-group"><Link className="btn btn-ghost btn-sm" to={adminPath(`enquiries/${item.id}`)}>View / edit</Link>{canDelete ? <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirmation({ ids: [item.id], message: `Delete the enquiry from ${item.fullName} and its internal notes?` })}>Delete</button> : null}</div></td>
        </tr>)}</tbody></table>
      </div><AdminPagination pagination={pagination} disabled={busy} onPage={(page) => changeFilter('page', page)} />
    </>}
    <ConfirmAction action={confirmation} busy={busy} onClose={() => setConfirmation(null)} onConfirm={handleDelete} />
    {creating ? <Modal title="Add enquiry" size="lg" onClose={saving ? undefined : () => setCreating(false)} footer={<><button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setCreating(false)}>Cancel</button><button type="submit" form="create-enquiry" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create enquiry'}</button></>}><AdminNotice notice={formError ? { type: 'error', message: formError } : null} /><form id="create-enquiry" onSubmit={handleCreate}><EnquiryForm value={form} onChange={setForm} disabled={saving} /></form></Modal> : null}
  </div>
}
