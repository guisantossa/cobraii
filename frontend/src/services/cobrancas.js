import api from './api'

export function getCobrancas() {
  return api.get('/cobrancas/')
}

export function getCobranca(id) { return api.get(`/cobrancas/${id}`) }
export function createCobranca(payload) { return api.post('/cobrancas/', payload) }
export function updateCobranca(id, payload) { return api.put(`/cobrancas/${id}`, payload) }
export function deleteCobranca(id) { return api.delete(`/cobrancas/${id}`) }
