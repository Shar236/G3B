import api from './client.js'

/** Public, unauthenticated content endpoints. */

export async function fetchHome() {
  const { data } = await api.get('/api/home')
  return data.data
}

export async function fetchContentBlocks() {
  const { data } = await api.get('/api/content-blocks')
  return data.data
}

export async function fetchSiteSettings() {
  const { data } = await api.get('/api/site-settings')
  return data.data
}

export async function submitEnquiry(payload) {
  const { data } = await api.post('/api/enquiries', payload)
  return data.data
}

export async function fetchHealth() {
  const { data } = await api.get('/api/health')
  return data
}

export default { fetchHome, fetchContentBlocks, fetchSiteSettings, submitEnquiry, fetchHealth }
