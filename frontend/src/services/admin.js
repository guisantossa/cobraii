// src/services/admin.js
import api from './api'

export async function getAdminFeedbacks(params = {}) {
  const {
    page = 1,
    page_size = 20,
    tipo,
    origem,
    q,
    dt_ini, // ISO string
    dt_fim, // ISO string
  } = params

  const qs = new URLSearchParams()
  qs.set('page', page)
  qs.set('page_size', page_size)
  if (tipo) qs.set('tipo', tipo)
  if (origem) qs.set('origem', origem)
  if (q) qs.set('q', q)
  if (dt_ini) qs.set('dt_ini', dt_ini)
  if (dt_fim) qs.set('dt_fim', dt_fim)

  const { data } = await api.get(`/admin/feedbacks?${qs.toString()}`)
  return data // { items, total, page, page_size, tipos }
}

export async function getAdminUsuarios(params = {}) {
  const {
    page = 1,
    page_size = 20,
    q,
    plano,         // id ou nome
    canal,         // 'email' | 'sms' | 'zap'
  } = params

  const qs = new URLSearchParams()
  qs.set('page', page)
  qs.set('page_size', page_size)
  if (q) qs.set('q', q)
  if (plano) qs.set('plano', plano)
  if (canal) qs.set('canal', canal)

  const { data } = await api.get(`/admin/usuarios?${qs.toString()}`)
  return data
}

/**
 * Métricas de topo do dashboard de usuários.
 * Espera (no ideal) resposta:
 * { total_usuarios, lembretes_ativos_total, envios_30d_total, por_plano: [{plano, count}] }
 */
export async function getAdminUsuariosMetrics() {
  const { data } = await api.get('/admin/usuarios/metrics')
  return data
}