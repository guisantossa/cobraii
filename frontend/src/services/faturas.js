import api from './api'

// Lista faturas com filtros opcionais (ex.: { cobranca_id })
export function getFaturas(params = {}) {
  return api.get('/faturas', { params })
}

// Açúcar sintático para buscar por cobrança específica
export function getFaturasByCobranca(cobranca_id) {
  return getFaturas({ cobranca_id })
}
