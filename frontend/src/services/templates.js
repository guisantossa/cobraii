// src/services/templates.js
import api from './api'

// Lista com paginação e filtros
export function getTemplates({ page = 1, page_size = 20, canal = null, search = '' } = {}) {
  const params = { page, page_size }
  if (canal) params.canal = canal
  if (search?.trim()) params.search = search.trim()
  return api.get('/templates', { params })
}

export function getTemplate(id) {
  return api.get(`/templates/${id}`)
}

export function createTemplate(payload) {
  return api.post('/templates', payload)
}

export function updateTemplate(id, payload) {
  return api.put(`/templates/${id}`, payload)
}

export function deleteTemplate(id) {
  return api.delete(`/templates/${id}`)
}
