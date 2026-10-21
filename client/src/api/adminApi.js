import api from './client.js'

/** Admin (authenticated) endpoints. */

// --- Auth -------------------------------------------------------------------
export const login = (credentials) => api.post('/api/auth/login', credentials).then((r) => r.data.data)
export const logout = () => api.post('/api/auth/logout').then((r) => r.data.data)
export const fetchMe = () => api.get('/api/auth/me').then((r) => r.data.data)
export const requestPasswordReset = (email) =>
  api.post('/api/auth/forgot-password', { email }).then((r) => r.data.data)
export const confirmPasswordReset = (token, password) =>
  api.post('/api/auth/reset-password', { token, password }).then((r) => r.data.data)

// --- Enquiries --------------------------------------------------------------
export const listEnquiries = (params) => api.get('/api/admin/enquiries', { params }).then((r) => r.data)
export const getEnquiry = (id) => api.get(`/api/admin/enquiries/${id}`).then((r) => r.data.data)
export const updateEnquiry = (id, payload) => api.patch(`/api/admin/enquiries/${id}`, payload).then((r) => r.data.data)
export const deleteEnquiry = (id) => api.delete(`/api/admin/enquiries/${id}`).then((r) => r.data.data)
export const fetchEnquiryStats = () => api.get('/api/admin/enquiries/stats').then((r) => r.data.data)
export const exportEnquiriesUrl = () => '/api/admin/enquiries/export'

/** Download the enquiry CSV through axios so auth cookies/CSRF apply. */
export async function downloadEnquiriesCsv(params = {}) {
  const response = await api.get('/api/admin/enquiries/export', { params, responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `g3b-enquiries-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// --- Partner Enquiries ------------------------------------------------------
export const listPartnerEnquiries = (params) => api.get('/api/admin/partner-enquiries', { params }).then((r) => r.data)
export const getPartnerEnquiry = (id) => api.get(`/api/admin/partner-enquiries/${id}`).then((r) => r.data.data)
export const updatePartnerEnquiry = (id, payload) => api.patch(`/api/admin/partner-enquiries/${id}`, payload).then((r) => r.data.data)
export const deletePartnerEnquiry = (id) => api.delete(`/api/admin/partner-enquiries/${id}`).then((r) => r.data.data)

/** Download the partner enquiry CSV through axios so auth cookies/CSRF apply. */
export async function downloadPartnerEnquiriesCsv(params = {}) {
  const response = await api.get('/api/admin/partner-enquiries/export', { params, responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `g3b-partner-enquiries-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// --- Generic content resources ---------------------------------------------
export const listResource = (resource) => api.get(`/api/admin/${resource}`).then((r) => r.data.data)
export const createResource = (resource, payload) =>
  api.post(`/api/admin/${resource}`, payload).then((r) => r.data.data)
export const updateResource = (resource, id, payload) =>
  api.patch(`/api/admin/${resource}/${id}`, payload).then((r) => r.data.data)
export const deleteResource = (resource, id) => api.delete(`/api/admin/${resource}/${id}`).then((r) => r.data.data)
export const reorderResource = (resource, ids) =>
  api.patch(`/api/admin/${resource}/reorder`, { ids }).then((r) => r.data.data)

// --- Content blocks & settings ---------------------------------------------
export const updateContentBlock = (key, payload) =>
  api.patch(`/api/admin/content-blocks/${key}`, payload).then((r) => r.data.data)
export const updateSiteSettings = (payload) => api.patch('/api/admin/site-settings', payload).then((r) => r.data.data)

// --- Users ------------------------------------------------------------------
export const listUsers = () => api.get('/api/admin/users').then((r) => r.data.data)
export const createUser = (payload) => api.post('/api/admin/users', payload).then((r) => r.data.data)
export const updateUser = (id, payload) => api.patch(`/api/admin/users/${id}`, payload).then((r) => r.data.data)
export const deleteUser = (id) => api.delete(`/api/admin/users/${id}`).then((r) => r.data.data)

// --- Media upload -----------------------------------------------------------
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post('/api/admin/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

// --- Pages & SEO Manager ----------------------------------------------------
export const listPages = (params) => api.get('/api/admin/pages', { params }).then((r) => r.data.data)
export const getPage = (id) => api.get(`/api/admin/pages/${id}`).then((r) => r.data.data)
export const createPage = (payload) => api.post('/api/admin/pages', payload).then((r) => r.data.data)
export const updatePage = (id, payload) => api.patch(`/api/admin/pages/${id}`, payload).then((r) => r.data.data)
export const deletePage = (id) => api.delete(`/api/admin/pages/${id}`).then((r) => r.data.data)
/** Save SEO metadata as a draft by default; pass publish:true to go live. */
export const savePageSeo = (id, payload, { publish = false } = {}) =>
  api.put(`/api/admin/pages/${id}/seo`, { ...payload, publish }).then((r) => r.data.data)
export const publishPageSeo = (id) => api.post(`/api/admin/pages/${id}/seo/publish`).then((r) => r.data.data)
export const listPageSections = (id) => api.get(`/api/admin/pages/${id}/sections`).then((r) => r.data.data)
export const savePageSection = (id, sectionKey, payload) =>
  api.put(`/api/admin/pages/${id}/sections/${sectionKey}`, payload).then((r) => r.data.data)
export const deletePageSection = (id, sectionKey) =>
  api.delete(`/api/admin/pages/${id}/sections/${sectionKey}`).then((r) => r.data.data)
export const reorderPageSections = (id, keys) =>
  api.patch(`/api/admin/pages/${id}/sections/reorder`, { keys }).then((r) => r.data.data)
export const listPageRevisions = (id) => api.get(`/api/admin/pages/${id}/revisions`).then((r) => r.data.data)
export const rollbackPageRevision = (id, revisionId) =>
  api.post(`/api/admin/pages/${id}/revisions/${revisionId}/rollback`).then((r) => r.data.data)

// --- SEO health dashboard ---------------------------------------------------
export const fetchSeoHealth = () => api.get('/api/admin/seo/health').then((r) => r.data.data)
export const runSeoAudit = () => api.post('/api/admin/seo/audit').then((r) => r.data.data)
export const updateSeoIssue = (id, status) =>
  api.patch(`/api/admin/seo/issues/${id}`, { status }).then((r) => r.data.data)

// --- Image library (media assets) -------------------------------------------
export const listMedia = (params) => api.get('/api/admin/media', { params }).then((r) => r.data)
export const fetchMediaStats = () => api.get('/api/admin/media/stats').then((r) => r.data.data)
export const listUnusedMedia = () => api.get('/api/admin/media/unused').then((r) => r.data.data)
export const getMedia = (id) => api.get(`/api/admin/media/${id}`).then((r) => r.data.data)
export async function uploadMediaAsset(file, extra = {}) {
  const formData = new FormData()
  formData.append('image', file)
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value)
  }
  const { data } = await api.post('/api/admin/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
export const updateMedia = (id, payload) => api.patch(`/api/admin/media/${id}`, payload).then((r) => r.data.data)
export const renameMedia = (id, name) => api.post(`/api/admin/media/${id}/rename`, { name }).then((r) => r.data.data)
export const reoptimizeMedia = (id) => api.post(`/api/admin/media/${id}/optimize`).then((r) => r.data.data)
export const deleteMedia = (id) => api.delete(`/api/admin/media/${id}`).then((r) => r.data.data)

// --- Redirect manager -------------------------------------------------------
export const listRedirects = (params) => api.get('/api/admin/redirects', { params }).then((r) => r.data)
export const createRedirect = (payload) => api.post('/api/admin/redirects', payload).then((r) => r.data.data)
export const updateRedirect = (id, payload) => api.patch(`/api/admin/redirects/${id}`, payload).then((r) => r.data.data)
export const deleteRedirect = (id) => api.delete(`/api/admin/redirects/${id}`).then((r) => r.data.data)

// --- Integrations (GSC / GA4 / PageSpeed) -----------------------------------
export const listIntegrations = () => api.get('/api/admin/integrations').then((r) => r.data.data)
export const updateIntegration = (provider, payload) =>
  api.patch(`/api/admin/integrations/${provider}`, payload).then((r) => r.data.data)
export const checkIntegration = (provider, url) =>
  api.post(`/api/admin/integrations/${provider}/check`, url ? { url } : {}).then((r) => r.data.data)

// --- Audit trail ------------------------------------------------------------
export const listAuditLogs = (params) => api.get('/api/admin/audit-logs', { params }).then((r) => r.data)
export const listAuditActions = () => api.get('/api/admin/audit-logs/actions').then((r) => r.data.data)

// --- Enquiry CRM extras -----------------------------------------------------
export const listEnquiryNotes = (id) => api.get(`/api/admin/enquiries/${id}/notes`).then((r) => r.data.data)
export const addEnquiryNote = (id, note) =>
  api.post(`/api/admin/enquiries/${id}/notes`, { note }).then((r) => r.data.data)
export const deleteEnquiryNote = (id, noteId) =>
  api.delete(`/api/admin/enquiries/${id}/notes/${noteId}`).then((r) => r.data.data)
export const anonymizeEnquiry = (id) =>
  api.post(`/api/admin/enquiries/${id}/anonymize`).then((r) => r.data.data)

export default {
  login,
  logout,
  fetchMe,
  requestPasswordReset,
  confirmPasswordReset,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  fetchEnquiryStats,
  downloadEnquiriesCsv,
  listEnquiryNotes,
  addEnquiryNote,
  deleteEnquiryNote,
  anonymizeEnquiry,
  listResource,
  createResource,
  updateResource,
  deleteResource,
  reorderResource,
  updateContentBlock,
  updateSiteSettings,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadImage,
  listPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  savePageSeo,
  publishPageSeo,
  listPageSections,
  savePageSection,
  deletePageSection,
  reorderPageSections,
  listPageRevisions,
  rollbackPageRevision,
  fetchSeoHealth,
  runSeoAudit,
  updateSeoIssue,
  listMedia,
  fetchMediaStats,
  listUnusedMedia,
  getMedia,
  uploadMediaAsset,
  updateMedia,
  renameMedia,
  reoptimizeMedia,
  deleteMedia,
  listRedirects,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  listIntegrations,
  updateIntegration,
  checkIntegration,
  listAuditLogs,
  listAuditActions,
}
