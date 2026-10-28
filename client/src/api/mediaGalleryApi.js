import api from './client.js'
import { uploadFileDirect } from './storageUpload.js'

/**
 * Public Media APIs
 */
export async function fetchMediaOverview() {
  const res = await api.get('/api/media/overview')
  return res.data.data
}

export async function fetchPublicPhotos({ category, search, page = 1, perPage = 18, sort } = {}) {
  const params = {}
  if (category && category !== 'All' && category !== 'All Photos') params.category = category
  if (search) params.search = search
  if (page) params.page = page
  if (perPage) params.perPage = perPage
  if (sort) params.sort = sort

  const res = await api.get('/api/media/photos', { params })
  return res.data
}

export async function fetchPublicVideos({ category, search, page = 1, perPage = 12, sort } = {}) {
  const params = {}
  if (category && category !== 'All' && category !== 'All Videos') params.category = category
  if (search) params.search = search
  if (page) params.page = page
  if (perPage) params.perPage = perPage
  if (sort) params.sort = sort

  const res = await api.get('/api/media/videos', { params })
  return res.data
}

export async function fetchMediaCategories(type = 'all') {
  const res = await api.get('/api/media/categories', { params: { type } })
  return res.data.data
}

/**
 * Protected Admin Media Gallery APIs
 */
export async function fetchAdminMedia({ type, category, status, search, page = 1, perPage = 30, sort } = {}) {
  const params = {}
  if (type) params.type = type
  if (category) params.category = category
  if (status) params.status = status
  if (search) params.search = search
  if (page) params.page = page
  if (perPage) params.perPage = perPage
  if (sort) params.sort = sort

  const res = await api.get('/api/admin/media-gallery', { params })
  return res.data
}

export async function fetchAdminMediaStats() {
  const res = await api.get('/api/admin/media-gallery/stats')
  return res.data.data
}

export async function createAdminMediaItem(payload) {
  if (!(payload instanceof FormData)) {
    const res = await api.post('/api/admin/media-gallery', payload)
    return res.data
  }

  const body = {}
  for (const [key, value] of payload.entries()) {
    if (!(typeof File !== 'undefined' && value instanceof File)) body[key] = value
  }
  const file = payload.get('file')
  if (typeof File !== 'undefined' && file instanceof File) {
    const purpose = file.type.startsWith('video/') ? 'gallery-video' : 'gallery-photo'
    const ticket = await uploadFileDirect(api, '/api/admin/uploads/sign', { purpose }, file)
    body.storageKey = ticket.path
    body.originalName = file.name
    body.contentType = file.type
    body.size = file.size
  }
  const thumbnail = payload.get('thumbnail')
  if (typeof File !== 'undefined' && thumbnail instanceof File) {
    const ticket = await uploadFileDirect(api, '/api/admin/uploads/sign', { purpose: 'gallery-photo' }, thumbnail)
    body.thumbnailStorageKey = ticket.path
  }
  const res = await api.post('/api/admin/media-gallery', body)
  return res.data
}

export async function bulkUploadAdminPhotos(formData) {
  const photos = []
  for (const file of formData.getAll('photos')) {
    const ticket = await uploadFileDirect(api, '/api/admin/uploads/sign', { purpose: 'gallery-photo' }, file)
    photos.push({ storageKey: ticket.path, originalName: file.name, contentType: file.type, size: file.size })
  }
  const payload = {
    photos,
    category: formData.get('category') || formData.get('category_id') || undefined,
    status: formData.get('status') || undefined,
  }
  const res = await api.post('/api/admin/media-gallery/bulk-photos', payload)
  return res.data
}

export async function updateAdminMediaItem(id, payload) {
  const isFormData = payload instanceof FormData
  const res = await api.patch(`/api/admin/media-gallery/${id}`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return res.data
}

export async function deleteAdminMediaItem(id) {
  const res = await api.delete(`/api/admin/media-gallery/${id}`)
  return res.data
}

export async function reorderAdminMedia(items) {
  const res = await api.patch('/api/admin/media-gallery/reorder', { items })
  return res.data
}
