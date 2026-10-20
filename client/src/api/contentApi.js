import api from './client.js'

/** Public, unauthenticated content endpoints. */

export async function fetchHome(options = {}) {
  const { data } = await api.get('/api/home', options)
  if (!data || typeof data !== 'object' || !data.data) {
    throw new Error('API returned an invalid response. Ensure VITE_API_URL points to your backend.')
  }
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
