import api from './api'

export function getCobrancas() {
  return api.get('/cobrancas/')
}

export function getCobranca(id) { return api.get(`/cobrancas/${id}`) }
export async  function createCobranca(payload) { 
  const {data} = await api.post('/cobrancas/', payload)
  return data
}
export async  function updateCobranca(id, payload) {
  const {data} = await api.put(`/cobrancas/${id}`, payload)
  return data
}
export function deleteCobranca(id) { return api.delete(`/cobrancas/${id}`) }
