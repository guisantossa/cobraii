// src/services/lembretes.js
// Usando seu axios pré-configurado em services/api.js (com cobraii_token no interceptor)
import api from './api'

/**
 * Tipos de canal aceitos pelo backend:
 * - 'whatsapp' | 'email' | 'sms'
 */
export const CANAIS = ['whatsapp', 'email', 'sms']

/**
 * Tipos/Formatos de payload aceitos:
 *
 * 1) LEMBRETE PERIÓDICO (RRULE)
 * {
 *   cliente_id: UUID,
 *   titulo: string,
 *   corpo?: string,
 *   canal: 'whatsapp'|'email'|'sms',
 *   rrule: 'FREQ=...;BYHOUR=...;...',
 *   dtstart: '2025-08-12T09:00:00-03:00',
 *   tz?: 'America/Sao_Paulo',
 *   ativa?: boolean,
 *   meta?: object
 * }
 *
 * 2) LEMBRETE DE FATURA (OFFSETS)
 * {
 *   cliente_id: UUID,
 *   fatura_id: UUID,
 *   titulo: string,
 *   corpo?: string,
 *   canal: 'whatsapp'|'email'|'sms',
 *   offsets: [
 *     { when: 'before'|'after', days: number, hora?: 'HH:MM', condicao?: 'sempre'|'se_nao_cumprido' }
 *   ],
 *   tz?: 'America/Sao_Paulo',
 *   ativa?: boolean,
 *   condicao?: 'sempre'|'se_nao_cumprido',
 *   meta?: object
 * }
 */

/**
 * Valida exclusividade (RRULE xor Fatura+Offsets) no CLIENT antes de disparar a API.
 * O backend também valida, mas aqui mantemos UX limpa e erros mais claros.
 * Lança Error com mensagem amigável em caso de invalidação.
 */
function assertExclusividade(payload) {
  const hasRRule = !!payload.rrule
  const hasFatura = !!payload.fatura_id
  const hasOffsets = Array.isArray(payload.offsets) && payload.offsets.length > 0

  if (hasRRule && (hasFatura || hasOffsets)) {
    throw new Error('Lembrete periódico (RRULE) não pode ter fatura/offsets.')
  }
  if (!hasRRule && !(hasFatura && hasOffsets)) {
    throw new Error('Lembrete de fatura exige fatura_id e offsets (sem RRULE).')
  }
}

/**
 * Normaliza strings vazias -> undefined para não confundir o backend.
 */
function normalizePayload(payload) {
  const obj = { ...payload }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string' && obj[k].trim() === '') {
      obj[k] = undefined
    }
  }
  return obj
}

/**
 * LISTAR LEMBRETES
 * GET /api/v1/lembretes/
 */
export async function listLembretes() {
  const { data } = await api.get('/lembretes/')
  return data
}

/**
 * OBTER LEMBRETE
 * GET /api/v1/lembretes/{id}
 */
export async function getLembrete(id) {
  const { data } = await api.get(`/lembretes/${id}`)
  return data
}

/**
 * CRIAR LEMBRETE
 * POST /api/v1/lembretes/
 * Aceita payload Periódico OU Fatura (ver formatos acima).
 */
export async function createLembrete(payload) {
  const body = normalizePayload(payload)
  assertExclusividade(body)
  const { data } = await api.post('/lembretes/', body)
  return data
}

/**
 * ATUALIZAR LEMBRETE
 * PUT /api/v1/lembretes/{id}
 * Pode mandar campos parciais, mas se alterar tipo (RRULE <-> Fatura), respeite a exclusividade.
 */
export async function updateLembrete(id, payloadParcial) {
  // Opcionalmente validamos se o parcial já viola claramente as regras.
  // (Observação: updates parciais podem depender do estado atual no backend;
  //  aqui só checamos casos óbvios para evitar UX ruim)
  const body = normalizePayload(payloadParcial)
  if ('rrule' in body || 'fatura_id' in body || 'offsets' in body) {
    // Se o usuário trocou algo que mexe no "tipo", checamos exclusividade com o que foi enviado
    const hasRRule = body.rrule != null
    const hasFatura = body.fatura_id != null
    const hasOffsets = Array.isArray(body.offsets) && body.offsets.length > 0
    if (hasRRule && (hasFatura || hasOffsets)) {
      throw new Error('Atualização inválida: RRULE não pode coexistir com fatura/offsets.')
    }
  }
  const { data } = await api.put(`/lembretes/${id}`, body)
  return data
}

/**
 * EXCLUIR/INATIVAR LEMBRETE
 * DELETE /api/v1/lembretes/{id}
 * (O backend implementa como inativar = true; aqui apenas chamamos)
 */
export async function deleteLembrete(id) {
  const { data } = await api.delete(`/lembretes/${id}`)
  return data
}

/**
 * PREVIEW DAS PRÓXIMAS EXECUÇÕES
 * POST /api/v1/lembretes/{id}/preview
 * body: { limit: number }
 */
export async function previewLembrete(id, limit = 10) {
  const { data } = await api.post(`/lembretes/${id}/preview`, { limit })
  return data // { execucoes: [{ scheduled_at, origem, motivo_skip? }, ...] }
}

/* ======================
 * Helpers para o Form
 * ======================
 */

/**
 * Gera payload Periódico (RRULE) a partir do estado do form.
 * Campos comuns: cliente_id, titulo, corpo, canal, tz, ativa, meta
 */
export function buildPayloadPeriodico({
  cliente_id,
  titulo,
  corpo,
  canal,
  rrule,
  dtstart, // Date ou string ISO
  tz = 'America/Sao_Paulo',
  ativa = true,
  meta = {},
}) {
  if (!cliente_id) throw new Error('cliente_id é obrigatório.')
  if (!titulo) throw new Error('titulo é obrigatório.')
  if (!canal) throw new Error('canal é obrigatório.')
  if (!rrule) throw new Error('rrule é obrigatório.')
  if (!dtstart) throw new Error('dtstart é obrigatório.')

  return {
    cliente_id,
    titulo,
    corpo,
    canal,
    rrule,
    dtstart: typeof dtstart === 'string' ? dtstart : dtstart.toISOString(),
    tz,
    ativa,
    meta,
  }
}

/**
 * Gera payload de Fatura (OFFSETS) a partir do estado do form.
 */
export function buildPayloadFatura({
  cliente_id,
  fatura_id,
  titulo,
  corpo,
  canal,
  offsets, // [{when:'before'|'after', days:number, hora?:'HH:MM', condicao?:'sempre'|'se_nao_cumprido'}]
  tz = 'America/Sao_Paulo',
  ativa = true,
  condicao = 'sempre', // default geral do lembrete (pode ser sobreposto por cada item)
  meta = {},
}) {
  if (!cliente_id) throw new Error('cliente_id é obrigatório.')
  if (!fatura_id) throw new Error('fatura_id é obrigatório.')
  if (!titulo) throw new Error('titulo é obrigatório.')
  if (!canal) throw new Error('canal é obrigatório.')
  if (!Array.isArray(offsets) || offsets.length === 0) {
    throw new Error('offsets é obrigatório (lista não vazia).')
  }
  // Validação leve dos offsets
  offsets.forEach((o, idx) => {
    if (!o.when || (o.when !== 'before' && o.when !== 'after')) {
      throw new Error(`offsets[${idx}].when deve ser 'before' ou 'after'.`)
    }
    if (typeof o.days !== 'number' || o.days < 0) {
      throw new Error(`offsets[${idx}].days deve ser número >= 0.`)
    }
    if (o.hora && !/^\d{2}:\d{2}$/.test(o.hora)) {
      throw new Error(`offsets[${idx}].hora deve ser 'HH:MM'.`)
    }
    if (o.condicao && !['sempre', 'se_nao_cumprido'].includes(o.condicao)) {
      throw new Error(`offsets[${idx}].condicao inválida.`)
    }
  })

  return {
    cliente_id,
    fatura_id,
    titulo,
    corpo,
    canal,
    offsets,
    tz,
    ativa,
    condicao, // default geral (cada item pode sobrescrever)
    meta,
  }
}
