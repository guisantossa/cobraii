// src/services/onboarding.js
import api from './api'

function hasAny(data) {
  if (!data) return false
  if (Array.isArray(data)) return data.length > 0
  if (Array.isArray(data.items)) return data.items.length > 0
  if (typeof data.total === 'number') return data.total > 0
  return false
}

async function safeGet(url) {
  try {
    const res = await api.get(url)
    return res?.data ?? null
  } catch {
    return null
  }
}

export async function checkFunnelProgress() {
  // usa a mesma paginação do resto do app
  const [cData, lData] = await Promise.all([
    safeGet('/clientes?page=1&page_size=1'),
    safeGet('/lembretes?page=1&page_size=1'),
  ])
  return {
    temCliente: hasAny(cData),
    temLembrete: hasAny(lData),
  }
}
