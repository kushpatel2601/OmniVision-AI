import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const shelfAPI = {
  getProducts:   () => api.get('/shelf/products'),
  getDashboard:  () => api.get('/shelf/dashboard'),
  scanAisle:  (id) => api.post(`/shelf/scan/${id}`),
  getScans:      () => api.get('/shelf/scans'),
  uploadShelfImage: (file, aisleId = 'A1') => {
    const form = new FormData()
    form.append('file', file)
    form.append('aisle_id', aisleId)
    return api.post('/shelf/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const planogramAPI = {
  getAisles:        () => api.get('/planogram/aisles'),
  getLayout: (id)   => api.get(`/planogram/layout/${id}`),
  runCheck:  (id)   => api.post(`/planogram/check/${id}`),
  getScores:        () => api.get('/planogram/scores'),
}

export const forecastAPI = {
  getForecast: (sku) => api.get(`/forecast/product/${sku}`),
  getReplenishment:  () => api.get('/forecast/replenishment'),
  getAll:            () => api.get('/forecast/all'),
}

export const alertsAPI = {
  getAlerts: (params) => api.get('/alerts', { params }),
  getStats:           () => api.get('/alerts/stats'),
  resolve:    (id)    => api.post(`/alerts/${id}/resolve`),
}

export default api
