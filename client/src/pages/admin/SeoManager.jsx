import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createPage,
  deletePage,
  deletePageSection,
  getPage,
  listPageRevisions,
  listPages,
  listPageCatalog,
  publishPageSeo,
  reorderPageSections,
  rollbackPageRevision,
  savePageSection,
  savePageSeo,
  updatePage,
  uploadImage,
} from '../../api/adminApi.js'
import { parseApiError, resolveMediaUrl } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import useDocumentMeta from '../../hooks/useDocumentMeta.js'

const PAGE_TYPES = ['home', 'services', 'service', 'destinations', 'destination', 'about', 'contact', 'blog', 'article', 'custom']
const HEADING_LEVELS = ['none', 'h1', 'h2', 'h3', 'h4']

/** Recommended lengths surfaced as guidance - never presented as a ranking rule. */
const TITLE_RECOMMENDED = 60
const DESCRIPTION_RECOMMENDED = 160

const SEO_FIELDS = {
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  metaRobots: 'index,follow',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  primaryKeyword: '',
  secondaryKeywords: '',
}

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—')

const emptySection = () => ({
  sectionKey: '',
  label: '',
  headingLevel: 'h2',
  headingText: '',
  description: '',
  ctaLabel: '',
  ctaUrl: '',
  imageUrl: '',
  imageAlt: '',
  imageCaption: '',
  isActive: true,
})

/** Small helper that shows how a field compares with the recommended length. */
function CharCount({ value, recommended }) {
  const length = (value || '').length
  const over = length > recommended
  return (
    <p className="hint" style={{ color: over ? '#b45309' : undefined }}>
      {length} / {recommended} characters {over ? '- shorter text is less likely to be truncated' : ''}
    </p>
  )
}

/** Pages & SEO manager: page registry, metadata editor, sections and revisions. */
export default function SeoManager() {
  const [pages, setPages] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [pageForm, setPageForm] = useState(null)
  const [seoForm, setSeoForm] = useState(SEO_FIELDS)
  const [structuredDataText, setStructuredDataText] = useState('')
  const [saving, setSaving] = useState(null)

  const [pageModal, setPageModal] = useState(null)
  const [sectionModal, setSectionModal] = useState(null)
  const [uploadingField, setUploadingField] = useState(null)

  const [revisions, setRevisions] = useState([])

  useDocumentMeta({ robots: 'noindex,nofollow,noarchive' })

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [registered, discovered] = await Promise.all([listPages(), listPageCatalog()])
      setPages(registered)
      setCatalog(discovered)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const loadDetail = useCallback(async (id) => {
    if (!id) return
    setDetailLoading(true)
    try {
      const page = await getPage(id)
      setDetail(page)
      setPageForm({
        name: page.name,
        route: page.route,
        slug: page.slug || '',
        pageType: page.pageType,
        template: page.template,
        status: page.status,
        isIndexable: page.isIndexable,
        sortOrder: page.sortOrder,
      })
      // A pending draft is what the admin last saved; show it so nothing appears lost.
      const pending = page.seo?.hasDraft ? page.seo?.draftPayload || {} : {}
      setStructuredDataText(JSON.stringify(pending.structuredData ?? page.seo?.structuredData ?? null, null, 2))
      setSeoForm({
        ...SEO_FIELDS,
        ...Object.fromEntries(Object.entries(page.seo || {}).filter(([key]) => key in SEO_FIELDS)),
        ...Object.fromEntries(Object.entries(pending).filter(([key]) => key in SEO_FIELDS)),
      })
      setRevisions(await listPageRevisions(id))
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const refreshAll = async () => {
    await loadPages()
    if (selectedId) await loadDetail(selectedId)
  }

  const seoPayload = () => {
    let structuredData
    try { structuredData = JSON.parse(structuredDataText || 'null') }
    catch { throw new Error('Structured data must be valid JSON.') }
    if (structuredData !== null && (typeof structuredData !== 'object' || Array.isArray(structuredData))) throw new Error('Structured data must be a JSON object or null.')
    return { ...seoForm, structuredData }
  }

  const handleSavePage = async (event) => {
    event.preventDefault()
    setSaving('page')
    setNotice(null)
    try {
      await updatePage(selectedId, { ...pageForm, sortOrder: Number(pageForm.sortOrder) || 0 })
      setNotice({ type: 'success', message: 'Page settings saved.' })
      await refreshAll()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(null)
    }
  }

  const saveSeo = async (publish) => {
    setSaving(publish ? 'publish' : 'draft')
    setNotice(null)
    try {
      await savePageSeo(selectedId, seoPayload(), { publish })
      setNotice({
        type: 'success',
        message: publish
          ? 'SEO metadata published. The public page now serves these tags.'
          : 'SEO draft saved. Publish it to update the public page.',
      })
      await refreshAll()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(null)
    }
  }

  const handlePublishDraft = async () => {
    setSaving('publish-draft')
    setNotice(null)
    try {
      await publishPageSeo(selectedId)
      setNotice({ type: 'success', message: 'Pending SEO draft published.' })
      await refreshAll()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(null)
    }
  }

  const handleCreatePage = async (event) => {
    event.preventDefault()
    setSaving('create')
    try {
      const created = await createPage({
        name: pageModal.name,
        route: pageModal.route,
        pageType: pageModal.pageType,
        template: pageModal.template,
        status: pageModal.status,
      })
      setPageModal(null)
      setNotice({ type: 'success', message: `Page "${created.name}" created.` })
      await loadPages()
      setSelectedId(created.id)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(null)
    }
  }

  const handleDeletePage = async () => {
    if (!window.confirm(`Delete the page "${detail.name}" (${detail.route})? This cannot be undone.`)) return
    try {
      await deletePage(selectedId)
      setSelectedId(null)
      setDetail(null)
      setNotice({ type: 'success', message: 'Page deleted.' })
      await loadPages()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleSaveSection = async (event) => {
    event.preventDefault()
    setSaving('section')
    try {
      const { sectionKey, ...payload } = sectionModal
      await savePageSection(selectedId, sectionKey, { ...payload, sortOrder: 0 })
      setSectionModal(null)
      setNotice({ type: 'success', message: 'Section saved.' })
      await loadDetail(selectedId)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteSection = async (sectionKey) => {
    if (!window.confirm(`Delete the "${sectionKey}" section?`)) return
    try {
      await deletePageSection(selectedId, sectionKey)
      setNotice({ type: 'success', message: 'Section deleted.' })
      await loadDetail(selectedId)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const moveSection = async (index, direction) => {
    const target = index + direction
    const sections = detail.sections || []
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    try {
      await reorderPageSections(selectedId, next.map((section) => section.sectionKey))
      setNotice({ type: 'success', message: 'Section order updated.' })
      await loadDetail(selectedId)
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleRollback = async (revision) => {
    if (!window.confirm(`Roll back to revision #${revision.id}? The current values will be replaced.`)) return
    try {
      await rollbackPageRevision(selectedId, revision.id)
      setNotice({ type: 'success', message: `Rolled back to revision #${revision.id}.` })
      await refreshAll()
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    }
  }

  const handleImageUpload = async (target, field, file) => {
    if (!file) return
    setUploadingField(field)
    try {
      const result = await uploadImage(file)
      const value = result.relativeUrl || result.url
      if (target === 'seo') setSeoForm((current) => ({ ...current, [field]: value }))
      else setSectionModal((current) => ({ ...current, [field]: value }))
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setUploadingField(null)
    }
  }

  const preview = useMemo(() => {
    const route = pageForm?.route || detail?.route || '/'
    const title = seoForm.seoTitle || detail?.name || 'Untitled page'
    const description = seoForm.metaDescription || 'No meta description set - search engines will choose their own snippet.'
    const canonical = seoForm.canonicalUrl || route
    return { route, title, description, canonical }
  }, [pageForm, detail, seoForm])

  const seoState = detail?.seo
  const isPublished = detail?.status === 'published'

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>
              <i className="fas fa-magnifying-glass-chart" aria-hidden="true" /> Pages &amp; SEO
            </h2>
            <p className="row-sub">
              Every published page, its search metadata and its editable headings. Published metadata is rendered into the
              public HTML by the server.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setPageModal({ name: '', route: '/', pageType: 'custom', template: 'managed', status: 'draft' })}
          >
            <i className="fas fa-plus" aria-hidden="true" /> Add page
          </button>
        </div>

        {notice ? (
          <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
          </p>
        ) : null}

        {loading ? (
          <StateBlock variant="loading" title="Loading pages…" />
        ) : error ? (
          <StateBlock variant="error" title="Could not load pages" message={error.message} onRetry={loadPages} />
        ) : pages.length === 0 ? (
          <StateBlock variant="empty" title="No pages registered" message="Add a page to manage its SEO metadata." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>SEO status</th>
                  <th>Indexable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td>{page.name}</td>
                    <td>
                      <code>{page.route}</code>
                    </td>
                    <td>
                      <span className={`badge badge-${page.status === 'published' ? 'active' : 'disabled'}`}>{page.status}</span>
                    </td>
                    <td>
                      {page.seo?.status || 'not set'}
                      {page.seo?.hasDraft ? <span className="badge badge-contacted" style={{ marginLeft: 6 }}>draft pending</span> : null}
                    </td>
                    <td>{page.isIndexable ? 'Yes' : 'No'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedId(page.id === selectedId ? null : page.id)}
                      >
                        {page.id === selectedId ? 'Close' : 'Edit SEO'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {catalog.some((page) => !page.registered) ? <div className="admin-card">
        <h2>Public pages available for CMS editing</h2>
        <p className="hint">Registration keeps the existing layout. Edit its supported section fields, or explicitly choose CMS section rendering in Page settings. Nothing is registered or replaced automatically.</p>
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>Page</th><th>Route</th><th>Action</th></tr></thead><tbody>
          {catalog.filter((page) => !page.registered).map((page) => <tr key={page.route}><td>{page.name}</td><td><code>{page.route}</code></td><td><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPageModal({ name: page.name, route: page.route, pageType: page.pageType || 'custom', template: 'default', status: 'published' })}>Register for editing</button></td></tr>)}
        </tbody></table></div>
      </div> : null}

      {selectedId ? (
        detailLoading && !detail ? (
          <StateBlock variant="loading" title="Loading page…" />
        ) : detail ? (
          <>
            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>
                    <i className="fas fa-file-lines" aria-hidden="true" /> {detail.name}
                  </h2>
                  <p className="row-sub">
                    <code>{detail.route}</code> · {detail.revisionCount} saved revision(s)
                  </p>
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDeletePage} disabled={detail.isSystem}>
                  <i className="fas fa-trash-can" aria-hidden="true" /> Delete page
                </button>
              </div>

              <form onSubmit={handleSavePage}>
                <div className="admin-grid-2">
                  <div className="admin-field">
                    <label htmlFor="page-name">Page name *</label>
                    <input
                      id="page-name"
                      className="admin-input"
                      value={pageForm.name}
                      onChange={(event) => setPageForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-route">Route (path) *</label>
                    <input
                      id="page-route"
                      className="admin-input"
                      value={pageForm.route}
                      onChange={(event) => setPageForm((current) => ({ ...current, route: event.target.value }))}
                      required
                    />
                    <p className="hint">Must start with &quot;/&quot; and must be unique across the site.</p>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-slug">Slug</label>
                    <input
                      id="page-slug"
                      className="admin-input"
                      value={pageForm.slug}
                      onChange={(event) => setPageForm((current) => ({ ...current, slug: event.target.value }))}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-type">Page type</label>
                    <select
                      id="page-type"
                      className="admin-select"
                      value={pageForm.pageType}
                      onChange={(event) => setPageForm((current) => ({ ...current, pageType: event.target.value }))}
                    >
                      {PAGE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-template">Page rendering</label>
                    <select id="page-template" className="admin-select" value={pageForm.template || 'default'} onChange={(event) => setPageForm((current) => ({ ...current, template: event.target.value }))}>
                      <option value="default">Existing site layout</option>
                      <option value="managed">Render published CMS sections</option>
                    </select>
                    <p className="hint">Managed rendering uses the sections below in their saved order. Include a form section to collect enquiries.</p>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-status">Status</label>
                    <select
                      id="page-status"
                      className="admin-select"
                      value={pageForm.status}
                      onChange={(event) => setPageForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </select>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="page-order">Sort order</label>
                    <input
                      id="page-order"
                      className="admin-input"
                      type="number"
                      min={0}
                      value={pageForm.sortOrder}
                      onChange={(event) => setPageForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </div>
                </div>

                <label className="admin-checkbox" htmlFor="page-indexable">
                  <input
                    id="page-indexable"
                    type="checkbox"
                    checked={Boolean(pageForm.isIndexable)}
                    onChange={(event) => setPageForm((current) => ({ ...current, isIndexable: event.target.checked }))}
                  />
                  Allow search engines to index this page
                </label>

                <div className="modal-actions left" style={{ marginTop: 18 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving === 'page'}>
                    {saving === 'page' ? 'Saving…' : 'Save page settings'}
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>
                    <i className="fas fa-tags" aria-hidden="true" /> Search &amp; social metadata
                  </h2>
                  <p className="row-sub">
                    Current state: {seoState?.status || 'not published'}
                    {seoState?.updatedAt ? ` · updated ${formatDate(seoState.updatedAt)}` : ''}
                  </p>
                </div>
                {seoState?.hasDraft ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handlePublishDraft} disabled={saving === 'publish-draft'}>
                    <i className="fas fa-upload" aria-hidden="true" /> Publish pending draft
                  </button>
                ) : null}
              </div>

              <div className="admin-field">
                <label htmlFor="seo-title">SEO title</label>
                <input
                  id="seo-title"
                  className="admin-input"
                  value={seoForm.seoTitle}
                  onChange={(event) => setSeoForm((current) => ({ ...current, seoTitle: event.target.value }))}
                />
                <CharCount value={seoForm.seoTitle} recommended={TITLE_RECOMMENDED} />
              </div>

              <div className="admin-field">
                <label htmlFor="seo-description">Meta description</label>
                <textarea
                  id="seo-description"
                  className="admin-textarea"
                  rows={3}
                  value={seoForm.metaDescription}
                  onChange={(event) => setSeoForm((current) => ({ ...current, metaDescription: event.target.value }))}
                />
                <CharCount value={seoForm.metaDescription} recommended={DESCRIPTION_RECOMMENDED} />
              </div>

              <div className="admin-field">
                <label htmlFor="seo-structured-data">Structured data (JSON-LD)</label>
                <textarea id="seo-structured-data" className="admin-textarea" rows={8} value={structuredDataText} onChange={(event) => setStructuredDataText(event.target.value)} />
                <p className="hint">Use a JSON object with accurate page information, or null to remove it. Save as draft or publish below.</p>
              </div>
              <div className="admin-field">
                <label>Search result preview</label>
                <div className="admin-card" style={{ marginBottom: 0, padding: 16, background: '#f8fafc' }}>
                  <p style={{ color: '#1a0dab', fontSize: '1.05rem', margin: 0 }}>{preview.title}</p>
                  <p style={{ color: '#006621', fontSize: '0.82rem', margin: '4px 0' }}>{preview.canonical}</p>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>{preview.description}</p>
                </div>
                <p className="hint">This is an approximation of how the listing may appear. It does not predict a ranking.</p>
              </div>

              <div className="admin-grid-2">
                <div className="admin-field">
                  <label htmlFor="seo-canonical">Canonical URL</label>
                  <input
                    id="seo-canonical"
                    className="admin-input"
                    value={seoForm.canonicalUrl}
                    placeholder="https://g3beducation.com/services"
                    onChange={(event) => setSeoForm((current) => ({ ...current, canonicalUrl: event.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="seo-robots">Meta robots</label>
                  <input
                    id="seo-robots"
                    className="admin-input"
                    value={seoForm.metaRobots}
                    placeholder="index,follow"
                    onChange={(event) => setSeoForm((current) => ({ ...current, metaRobots: event.target.value }))}
                  />
                  {isPublished && /noindex/i.test(seoForm.metaRobots) ? (
                    <p className="hint" style={{ color: '#b91c1c' }}>
                      This page is published but set to noindex - it cannot appear in search results.
                    </p>
                  ) : null}
                </div>
                <div className="admin-field">
                  <label htmlFor="seo-og-title">Open Graph title</label>
                  <input
                    id="seo-og-title"
                    className="admin-input"
                    value={seoForm.ogTitle}
                    onChange={(event) => setSeoForm((current) => ({ ...current, ogTitle: event.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="seo-og-description">Open Graph description</label>
                  <input
                    id="seo-og-description"
                    className="admin-input"
                    value={seoForm.ogDescription}
                    onChange={(event) => setSeoForm((current) => ({ ...current, ogDescription: event.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="seo-primary-keyword">Primary keyword or topic</label>
                  <input
                    id="seo-primary-keyword"
                    className="admin-input"
                    value={seoForm.primaryKeyword}
                    onChange={(event) => setSeoForm((current) => ({ ...current, primaryKeyword: event.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="seo-secondary-keywords">Secondary keywords</label>
                  <input
                    id="seo-secondary-keywords"
                    className="admin-input"
                    value={seoForm.secondaryKeywords}
                    onChange={(event) => setSeoForm((current) => ({ ...current, secondaryKeywords: event.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="seo-og-image">Social sharing image</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="seo-og-image"
                    className="admin-input"
                    value={seoForm.ogImage}
                    placeholder="https://… or upload"
                    onChange={(event) => setSeoForm((current) => ({ ...current, ogImage: event.target.value }))}
                  />
                  <label className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    <i className="fas fa-cloud-arrow-up" aria-hidden="true" />{' '}
                    {uploadingField === 'ogImage' ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleImageUpload('seo', 'ogImage', event.target.files?.[0])}
                    />
                  </label>
                </div>
                {seoForm.ogImage ? (
                  <img
                    src={resolveMediaUrl(seoForm.ogImage)}
                    alt=""
                    className="thumb"
                    style={{ marginTop: 10, width: 180, height: 100, objectFit: 'cover', borderRadius: 8 }}
                  />
                ) : null}
              </div>

              {seoState?.structuredData ? (
                <div className="admin-field">
                  <label>Page structured data (JSON-LD)</label>
                  <textarea
                    className="admin-textarea"
                    rows={6}
                    readOnly
                    value={JSON.stringify(seoState.structuredData, null, 2)}
                    style={{ fontFamily: 'Consolas, monospace', fontSize: 13 }}
                  />
                  <p className="hint">Stored schema for this page. Only truthful, relevant data should be recorded here.</p>
                </div>
              ) : null}

              <div className="modal-actions left" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => saveSeo(false)} disabled={saving === 'draft'}>
                  {saving === 'draft' ? 'Saving…' : 'Save draft'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => saveSeo(true)} disabled={saving === 'publish'}>
                  {saving === 'publish' ? 'Publishing…' : 'Save & publish'}
                </button>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>
                    <i className="fas fa-heading" aria-hidden="true" /> Headings &amp; sections
                  </h2>
                  <p className="row-sub">
                    Editable headings and supporting copy. Keep exactly one H1 per page for accessibility.
                  </p>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSectionModal(emptySection())}>
                  <i className="fas fa-plus" aria-hidden="true" /> Add section
                </button>
              </div>

              {detail.sections?.length ? (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Level</th>
                        <th>Heading</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sections.map((section, index) => (
                        <tr key={section.sectionKey}>
                          <td>
                            <code>{section.sectionKey}</code>
                          </td>
                          <td>{section.headingLevel}</td>
                          <td>{section.headingText || '—'}</td>
                          <td>
                            <span className={`badge badge-${section.isActive ? 'active' : 'disabled'}`}>
                              {section.isActive ? 'active' : 'hidden'}
                            </span>
                          </td>
                          <td className="actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setSectionModal({ ...emptySection(), ...section })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={index === 0}
                              aria-label="Move up"
                              onClick={() => moveSection(index, -1)}
                            >
                              <i className="fas fa-arrow-up" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={index === detail.sections.length - 1}
                              aria-label="Move down"
                              onClick={() => moveSection(index, 1)}
                            >
                              <i className="fas fa-arrow-down" aria-hidden="true" />
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteSection(section.sectionKey)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <StateBlock
                  variant="empty"
                  title="No editable sections"
                  message="Add a section to manage this page's headings, copy and images from the dashboard."
                />
              )}
            </div>

            <div className="admin-card">
              <h2>
                <i className="fas fa-clock-rotate-left" aria-hidden="true" /> Publishing history
              </h2>
              {revisions.length === 0 ? (
                <StateBlock variant="empty" title="No revisions yet" message="Published metadata and section changes are recorded here." />
              ) : (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Entity</th>
                        <th>Note</th>
                        <th>By</th>
                        <th>When</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revisions.map((revision) => (
                        <tr key={revision.id}>
                          <td>{revision.id}</td>
                          <td>{revision.entity}</td>
                          <td>{revision.changeNote}</td>
                          <td>{revision.createdByEmail || '—'}</td>
                          <td>{formatDate(revision.createdAt)}</td>
                          <td className="actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRollback(revision)}>
                              Roll back
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null
      ) : null}

      {pageModal ? (
        <Modal
          title="Add a page"
          onClose={() => setPageModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setPageModal(null)}>
                Cancel
              </button>
              <button type="submit" form="create-page-form" className="btn btn-primary" disabled={saving === 'create'}>
                {saving === 'create' ? 'Creating…' : 'Create page'}
              </button>
            </>
          }
        >
          <form id="create-page-form" onSubmit={handleCreatePage}>
            <div className="admin-field">
              <label htmlFor="new-page-name">Page name *</label>
              <input
                id="new-page-name"
                className="admin-input"
                value={pageModal.name}
                onChange={(event) => setPageModal((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="new-page-route">Route (path) *</label>
              <input
                id="new-page-route"
                className="admin-input"
                value={pageModal.route}
                onChange={(event) => setPageModal((current) => ({ ...current, route: event.target.value }))}
                required
              />
              <p className="hint">For example /about or /services/ielts. Must begin with &quot;/&quot;.</p>
            </div>
            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="new-page-type">Page type</label>
                <select
                  id="new-page-type"
                  className="admin-select"
                  value={pageModal.pageType}
                  onChange={(event) => setPageModal((current) => ({ ...current, pageType: event.target.value }))}
                >
                  {PAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="new-page-template">Page rendering</label>
                <select id="new-page-template" className="admin-select" value={pageModal.template || 'managed'} onChange={(event) => setPageModal((current) => ({ ...current, template: event.target.value }))}>
                  <option value="managed">Render published CMS sections</option>
                  <option value="default">Existing site layout</option>
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="new-page-status">Status</label>
                <select
                  id="new-page-status"
                  className="admin-select"
                  value={pageModal.status}
                  onChange={(event) => setPageModal((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {sectionModal ? (
        <Modal
          title={`${sectionModal.sectionKey ? 'Edit' : 'Add'} section`}
          onClose={() => setSectionModal(null)}
          size="lg"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setSectionModal(null)}>
                Cancel
              </button>
              <button type="submit" form="section-form" className="btn btn-primary" disabled={saving === 'section'}>
                {saving === 'section' ? 'Saving…' : 'Save section'}
              </button>
            </>
          }
        >
          <form id="section-form" onSubmit={handleSaveSection}>
            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="section-key">Section key *</label>
                <input
                  id="section-key"
                  className="admin-input"
                  value={sectionModal.sectionKey}
                  disabled={Boolean(detail?.sections?.some((item) => item.sectionKey === sectionModal.sectionKey))}
                  onChange={(event) => setSectionModal((current) => ({ ...current, sectionKey: event.target.value }))}
                  required
                />
                <p className="hint">Letters, numbers, &quot;-&quot; and &quot;_&quot; only, e.g. hero or about-intro.</p>
              </div>
              <div className="admin-field">
                <label htmlFor="section-label">Label</label>
                <input
                  id="section-label"
                  className="admin-input"
                  value={sectionModal.label}
                  onChange={(event) => setSectionModal((current) => ({ ...current, label: event.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="section-heading-level">Heading level</label>
                <select
                  id="section-heading-level"
                  className="admin-select"
                  value={sectionModal.headingLevel}
                  onChange={(event) => setSectionModal((current) => ({ ...current, headingLevel: event.target.value }))}
                >
                  {HEADING_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="section-heading-text">Heading text</label>
                <input
                  id="section-heading-text"
                  className="admin-input"
                  value={sectionModal.headingText}
                  onChange={(event) => setSectionModal((current) => ({ ...current, headingText: event.target.value }))}
                />
              </div>
            </div>

            <div className="admin-field">
              <label htmlFor="section-description">Description</label>
              <textarea
                id="section-description"
                className="admin-textarea"
                rows={4}
                value={sectionModal.description}
                onChange={(event) => setSectionModal((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="section-cta-label">CTA button label</label>
                <input
                  id="section-cta-label"
                  className="admin-input"
                  value={sectionModal.ctaLabel}
                  onChange={(event) => setSectionModal((current) => ({ ...current, ctaLabel: event.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="section-cta-url">CTA link</label>
                <input
                  id="section-cta-url"
                  className="admin-input"
                  value={sectionModal.ctaUrl}
                  placeholder="/services"
                  onChange={(event) => setSectionModal((current) => ({ ...current, ctaUrl: event.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="section-image-alt">Image alt text</label>
                <input
                  id="section-image-alt"
                  className="admin-input"
                  value={sectionModal.imageAlt}
                  onChange={(event) => setSectionModal((current) => ({ ...current, imageAlt: event.target.value }))}
                />
                <p className="hint">Describe what the image shows. Never repeat keywords for their own sake.</p>
              </div>
              <div className="admin-field">
                <label htmlFor="section-image-caption">Image caption</label>
                <input
                  id="section-image-caption"
                  className="admin-input"
                  value={sectionModal.imageCaption}
                  onChange={(event) => setSectionModal((current) => ({ ...current, imageCaption: event.target.value }))}
                />
              </div>
            </div>

            <div className="admin-field">
              <label htmlFor="section-image-url">Section image</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="section-image-url"
                  className="admin-input"
                  value={sectionModal.imageUrl}
                  onChange={(event) => setSectionModal((current) => ({ ...current, imageUrl: event.target.value }))}
                />
                <label className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  <i className="fas fa-cloud-arrow-up" aria-hidden="true" />{' '}
                  {uploadingField === 'imageUrl' ? 'Uploading…' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(event) => handleImageUpload('section', 'imageUrl', event.target.files?.[0])}
                  />
                </label>
              </div>
              {sectionModal.imageUrl ? (
                <img
                  src={resolveMediaUrl(sectionModal.imageUrl)}
                  alt=""
                  className="thumb"
                  style={{ marginTop: 10, width: 160, height: 90, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : null}
            </div>

            <label className="admin-checkbox" htmlFor="section-active">
              <input
                id="section-active"
                type="checkbox"
                checked={Boolean(sectionModal.isActive)}
                onChange={(event) => setSectionModal((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Show this section on the public page
            </label>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
