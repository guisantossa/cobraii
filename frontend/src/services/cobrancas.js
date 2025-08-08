// services/cobrancas.js
import api from './api'

export const listarCobrancas = () => api.get('/cobrancas/')
export const criarCobranca = (data) => api.post('/cobrancas/', data)
export const obterCobranca = (id) => api.get(`/cobrancas/${id}`)
export const atualizarCobranca = (id, data) => api.put(`/cobrancas/${id}`, data)
export const cancelarCobranca = (id) => api.delete(`/cobrancas/${id}`)

