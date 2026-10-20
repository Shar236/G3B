import api from './client.js'

export const createEnquiry = (payload) => api.post('/api/admin/enquiries', payload).then((response) => response.data.data)
export const bulkEnquiries = (payload) => api.post('/api/admin/enquiries/bulk', payload).then((response) => response.data.data)
export const createSubscriber = (payload) => api.post('/api/admin/subscribers', payload).then((response) => response.data.data)
export const updateSubscriber = (id, payload) => api.patch(`/api/admin/subscribers/${id}`, payload).then((response) => response.data.data)
export const deleteSubscriber = (id) => api.delete(`/api/admin/subscribers/${id}`).then((response) => response.data.data)
export const bulkSubscribers = (payload) => api.post('/api/admin/subscribers/bulk', payload).then((response) => response.data.data)

export async function downloadSubscribersCsv(params) {
  const response = await api.get('/api/admin/subscribers/export', { params, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `g3b-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
