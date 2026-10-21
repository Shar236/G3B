import { useState } from 'react'
import {
  deletePartnerEnquiry,
  downloadPartnerEnquiriesCsv,
  getPartnerEnquiry,
  updatePartnerEnquiry,
} from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import {
  AdminNotice,
  AdminPagination,
  ConfirmAction,
  displayDate,
  TableSkeleton,
} from './AdminDataUI.jsx'
import useAdminCollection, { useDebouncedValue } from './useAdminCollection.js'

const defaults = {
  search: '',
  status: '',
  organizationType: '',
  page: 1,
  perPage: 20,
}

const PARTNER_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In Review' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Declined' },
  { value: 'archived', label: 'Archived' },
]

export default function PartnerEnquiries() {
  const { user } = useAuth()
  const canDelete = user?.role === 'admin'
  const [filters, setFilters] = useState(defaults)
  const search = useDebouncedValue(filters.search)

  const params = Object.fromEntries(
    Object.entries({ ...filters, search }).filter(
      ([, value]) => value !== '' && value !== undefined
    )
  )

  const { items, setItems, pagination, loading, error, reload } =
    useAdminCollection('/api/admin/partner-enquiries', params)

  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const changeFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1,
    }))
  }

  const resetFilters = () => setFilters(defaults)

  const handleStatusChange = async (id, newStatus) => {
    if (busy) return
    const prev = items
    setBusy(true)
    setNotice(null)
    setItems((curr) =>
      curr.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    )
    if (viewItem && viewItem.id === id) {
      setViewItem((curr) => ({ ...curr, status: newStatus }))
    }

    try {
      await updatePartnerEnquiry(id, { status: newStatus })
      setNotice({ type: 'success', message: 'Partner enquiry status updated.' })
      reload()
    } catch (cause) {
      setItems(prev)
      setNotice({
        type: 'error',
        message: `${parseApiError(cause).message} Reverted status change.`,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleOpenDetail = async (item) => {
    setViewItem(item)
    setInternalNotes(item.internalNotes || '')
    setLoadingDetail(true)
    try {
      const full = await getPartnerEnquiry(item.id)
      setViewItem(full)
      setInternalNotes(full.internalNotes || '')
    } catch {
      // Keep existing preview if fetch fails
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!viewItem) return
    setSavingNotes(true)
    try {
      await updatePartnerEnquiry(viewItem.id, { internalNotes })
      setViewItem((curr) => ({ ...curr, internalNotes }))
      setNotice({ type: 'success', message: 'Internal notes saved.' })
      reload()
    } catch (cause) {
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmation?.id) return
    const id = confirmation.id
    setBusy(true)
    try {
      await deletePartnerEnquiry(id)
      setConfirmation(null)
      if (viewItem?.id === id) setViewItem(null)
      setNotice({ type: 'success', message: 'Partner enquiry removed.' })
      reload()
    } catch (cause) {
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const exportParams = { ...params }
      delete exportParams.page
      delete exportParams.perPage
      await downloadPartnerEnquiriesCsv(exportParams)
      setNotice({
        type: 'success',
        message: 'Partner enquiries exported to CSV.',
      })
    } catch (cause) {
      setNotice({ type: 'error', message: parseApiError(cause).message })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Partner Enquiries</h1>
          <p className="admin-page-subtitle">
            Manage institutional, consultant, and educator collaboration enquiries
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            <i className="fas fa-file-csv" aria-hidden="true" />
            {exporting ? ' Exporting…' : ' Export CSV'}
          </button>
        </div>
      </div>

      <AdminNotice notice={notice} />

      {/* Filter toolbar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <i className="fas fa-search admin-search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, organization, email, location…"
            value={filters.search}
            onChange={(e) => changeFilter('search', e.target.value)}
            className="form-control admin-search-input"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => changeFilter('status', e.target.value)}
          className="form-select admin-filter-select"
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          {PARTNER_STATUSES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>

        <select
          value={filters.organizationType}
          onChange={(e) => changeFilter('organizationType', e.target.value)}
          className="form-select admin-filter-select"
          aria-label="Filter by Organization Type"
        >
          <option value="">All Organization Types</option>
          <option value="Educational Consultant">Educational Consultant</option>
          <option value="School / Educational Institution">School / Educational Institution</option>
          <option value="Independent Career Counsellor">Career Counsellor</option>
          <option value="Student Recruitment & Guidance">Student Recruitment</option>
          <option value="Training / Educational Service Provider">Training Provider</option>
          <option value="Other Organization">Other</option>
        </select>

        {(filters.search || filters.status || filters.organizationType) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Table & Data states */}
      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : error ? (
        <StateBlock
          variant="error"
          title="Could not load enquiries"
          message={parseApiError(error).message}
          actionLabel="Try again"
          onAction={reload}
        />
      ) : items.length === 0 ? (
        <StateBlock
          variant="empty"
          title="No partner enquiries found"
          message={
            filters.search || filters.status || filters.organizationType
              ? 'Try widening or clearing your search filters.'
              : 'New collaboration submissions will appear here securely.'
          }
        />
      ) : (
        <div className="admin-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Organization</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Received</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.fullName}</strong>
                    <div className="row-sub">{item.workEmail}</div>
                  </td>
                  <td>
                    <div>{item.organizationName}</div>
                    {item.websiteUrl && (
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="row-link text-xs"
                      >
                        <i className="fas fa-external-link-alt" /> {item.websiteUrl}
                      </a>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-light">
                      {item.organizationType || 'Unspecified'}
                    </span>
                  </td>
                  <td>{item.location || '—'}</td>
                  <td>
                    <select
                      value={item.status || 'new'}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`status-pill status-${item.status || 'new'}`}
                      aria-label="Change enquiry status"
                    >
                      {PARTNER_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="text-xs text-muted">
                      {displayDate(item.createdAt)}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Inspect enquiry"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <i className="fas fa-eye" aria-hidden="true" /> View
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        title="Delete enquiry"
                        onClick={() =>
                          setConfirmation({
                            id: item.id,
                            title: 'Delete partner enquiry?',
                            message: `Are you sure you want to delete the enquiry from "${item.fullName}" (${item.organizationName})?`,
                          })
                        }
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <AdminPagination
          pagination={pagination}
          disabled={loading}
          onPage={(p) => changeFilter('page', p)}
        />
      )}

      {/* Detail Modal */}
      {viewItem && (
        <Modal
          title={`Enquiry: ${viewItem.fullName}`}
          onClose={() => setViewItem(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    const id = viewItem.id
                    setConfirmation({
                      id,
                      title: 'Delete partner enquiry?',
                      message: `Are you sure you want to delete the enquiry from "${viewItem.fullName}" (${viewItem.organizationName})?`,
                    })
                  }}
                >
                  Delete
                </button>
              )}
            </>
          }
        >
          {loadingDetail ? (
            <p>Loading full details…</p>
          ) : (
            <div className="partner-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <small className="text-muted">Full Name</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>{viewItem.fullName}</p>
                </div>
                <div>
                  <small className="text-muted">Work Email</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    <a href={`mailto:${viewItem.workEmail}`}>{viewItem.workEmail}</a>
                  </p>
                </div>
                <div>
                  <small className="text-muted">Phone Number</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    <a href={`tel:${viewItem.phoneNumber}`}>{viewItem.phoneNumber}</a>
                  </p>
                </div>
                <div>
                  <small className="text-muted">Organization Name</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>{viewItem.organizationName}</p>
                </div>
                <div>
                  <small className="text-muted">Organization Type</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>{viewItem.organizationType}</p>
                </div>
                <div>
                  <small className="text-muted">Location</small>
                  <p style={{ margin: 0, fontWeight: 600 }}>{viewItem.location || '—'}</p>
                </div>
                {viewItem.websiteUrl && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <small className="text-muted">Website URL</small>
                    <p style={{ margin: 0 }}>
                      <a href={viewItem.websiteUrl} target="_blank" rel="noreferrer noopener">
                        {viewItem.websiteUrl}
                      </a>
                    </p>
                  </div>
                )}
                {viewItem.partnershipInterest && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <small className="text-muted">Partnership Interest</small>
                    <p style={{ margin: 0, fontWeight: 600 }}>{viewItem.partnershipInterest}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Message</h4>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {viewItem.message || 'No additional message provided.'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Status Management</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={viewItem.status || 'new'}
                    onChange={(e) => handleStatusChange(viewItem.id, e.target.value)}
                    className="form-select"
                    style={{ maxWidth: '200px' }}
                  >
                    {PARTNER_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted">
                    Received on {displayDate(viewItem.createdAt)}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Internal Admin Notes</h4>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private internal notes regarding follow-up, partner qualification, or conversation history…"
                  className="form-control"
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? 'Saving Notes…' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Confirmation modal for delete */}
      <ConfirmAction
        action={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
