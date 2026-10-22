import axios from 'axios'
import { baseURL } from './client.js'

// Student cookies and CSRF state are isolated from administrator authentication.
const studentApi = axios.create({ baseURL, withCredentials: true, timeout: 15000, headers: { 'Content-Type': 'application/json' } })
let csrfToken = null
studentApi.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method) && csrfToken) config.headers['X-Student-CSRF-Token'] = csrfToken
  return config
})
studentApi.interceptors.response.use((response) => {
  if (Object.hasOwn(response.data?.data || {}, 'csrfToken')) csrfToken = response.data.data.csrfToken
  if (response.config.url === '/api/student/logout') csrfToken = null
  return response
})

export async function getStudentSession() {
  const response = await studentApi.get('/api/student/session')
  return response.data.data
}

export default studentApi
