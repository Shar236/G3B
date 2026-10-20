import api from './client.js'

const route = '/api/admin/youtube-shorts'

export const listYoutubeShorts = () => api.get(route).then((response) => response.data.data)
export const getYoutubeShortsStatus = () => api.get(`${route}/status`).then((response) => response.data.data)
// A complete channel import can require several paginated requests.
export const syncYoutubeShorts = () => api.post(`${route}/sync`, {}, { timeout: 120000 }).then((response) => response.data.data)
export const registerYoutubeShort = (url) => api.post(route, { url }).then((response) => response.data.data)
export const saveYoutubeShort = (payload) => api.post(`${route}/manual`, payload).then((response) => response.data.data)
export const updateYoutubeShort = (id, payload) => api.patch(`${route}/${id}`, payload).then((response) => response.data.data)
export const removeYoutubeShort = (id) => api.delete(`${route}/${id}`).then((response) => response.data.data)

