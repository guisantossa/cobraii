// src/pages/LembretesForm.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import Autocomplete from '../components/ui/Autocomplete'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import UpgradeCTA from '../components/billing/UpgradeCTA'
import { sendFeedback } from '../services/feedback'

import api from '../services/api'
import { getClientes } from '../services/clientes'
import { getTemplates } from '../services/templates'
import {
  createLembrete,
  updateLembrete,
  getLembrete,
  previewLembrete,
  buildPayloadPeriodico,
  CANAIS,
} from '../services/lembretes'

const HHMM_RE = /^\d{2}:\d{2}$/
const SP_OFFSET = '-03:00' // horário fixo SP

// === helpers api locais ===
async function getClienteById(clienteId) {
  if (!clienteId) return null
  const { data } = await api.get(`/clientes/${clienteId}`)
  return data
}

const FREQS = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
]
const WEEKDAYS = [
  { v: 'MO', l: 'Seg' }, { v: 'TU', l: 'Ter' }, { v: 'WE', l: 'Qua' },
  { v: 'TH', l: 'Qui' }, { v: 'FR', l: 'Sex' }, { v: 'SA', l: 'Sáb' },
  { v: 'SU', l: 'Dom' },
]

export default function LembretesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [search] = useSearchParams()
  const isEdit = useMemo(() => Boolean(id), [id])

  const [showUpgrade, setShowUpgrade] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')

  // Somente PERIÓDICO neste form
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // cliente
  const [clientes, setClientes] = useState([])              // lista para "Novo"
  const [clienteId, setClienteId] = useState(search.get('cliente_id') || '')
  const [clienteNome, setClienteNome] = useState('')        // exibição e preenchimento

  // canais múltiplos
  const [canaisSel, setCanaisSel] = useState([])

  const [form, setForm] = useState({
    // comuns
    titulo: '',
    corpo: '',
    ativa: true,
    meta: {},

    // cliente (apenas para NOVO; edição fica travado)
    cliente_busca: '',

    // periódico
    inicio_data: '',             // YYYY-MM-DD  (mostrado novamente)
    inicio_hora: '09:00',        // HH:MM (step 10 min)
    rrule: '',                   // gerada pelo builder
    rrule_freq: 'MONTHLY',
    rrule_dias_semana: [],       // ['MO','WE'] se semanal
  })

  // === Templates (importar para o corpo) ===
  const [tplOpen, setTplOpen] = useState(false)
  const [tplBusca, setTplBusca] = useState('')
  const [tplLoading, setTplLoading] = useState(false)
  const [tplItems, setTplItems] = useState([])
  const [tplError, setTplError] = useState('')
  const [tplInfo, setTplInfo] = useState('')

  useEffect(() => {
    if (!tplOpen) return
    let alive = true
    const t = setTimeout(async () => {
      try {
        setTplLoading(true); setTplError('')
        const { data } = await getTemplates({ page: 1, page_size: 20, search: tplBusca })
        if (!alive) return
        setTplItems(Array.isArray(data?.items) ? data.items : [])
      } catch (err) {
        if (alive) setTplError(err?.response?.data?.detail || 'Falha ao carregar templates')
      } finally {
        if (alive) setTplLoading(false)
      }
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [tplOpen, tplBusca])

  function handleUseTemplate(tpl) {
    setForm(prev => ({
      ...prev,
      titulo: prev.titulo?.trim() ? prev.titulo : (tpl?.titulo || ''),
      corpo: tpl?.corpo ?? prev.corpo,
    }))
    setTplOpen(false)
    setTplInfo('Template importado. Você pode editar o texto livremente.')
    setTimeout(() => setTplInfo(''), 3000)
  }

  // carregar dados (cliente + lembrete quando edição) e lista de clientes quando novo
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (isEdit) {
          setLoading(true)
          const l = await getLembrete(id)

          // cliente travado na edição
          const cid = l.cliente_id || clienteId
          setClienteId(cid || '')
          const nome = l?.cliente?.nome || l?.cliente_nome_avulso
          if (nome) setClienteNome(nome)
          else if (cid) {
            try {
              const cli = await getClienteById(cid)
              if (mounted) setClienteNome(cli?.nome || '')
            } catch { /* silencioso */ }
          }

          // canais -> array
          setCanaisSel([l.canal].filter(Boolean))

          // pega data e hora de dtstart
          let inicio_data = ''
          let inicio_hora = '09:00'
          if (l.dtstart) {
            const d = new Date(l.dtstart)
            inicio_data = d.toISOString().slice(0, 10)
            const hh = String(d.getHours()).padStart(2, '0')
            const mm = String(d.getMinutes()).padStart(2, '0')
            inicio_hora = `${hh}:${mm}`
          }

          setForm(prev => ({
            ...prev,
            titulo: l.titulo || '',
            corpo: l.corpo || '',
            ativa: l.ativa ?? true,
            meta: l.meta || {},
            inicio_data,
            inicio_hora,
            rrule: l.rrule || '',
            rrule_freq: inferFreqFromRRule(l.rrule) || 'MONTHLY',
            rrule_dias_semana: inferByDayFromRRule(l.rrule),
          }))
        } else {
          // NOVO: cliente livre (lista + opcionalmente pré-seleciona por ?cliente_id)
          try {
            const { data } = await getClientes()
            if (mounted) setClientes(Array.isArray(data) ? data : (data?.items ?? []))
          } catch { if (mounted) setClientes([]) }

          if (clienteId) {
            try {
              const cli = await getClienteById(clienteId)
              if (mounted) {
                setClienteNome(cli?.nome || '')
                setForm(f => ({ ...f, cliente_busca: cli?.nome || '' }))
              }
            } catch { /* silencioso */ }
          }
        }
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Falha ao carregar o formulário')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, isEdit, clienteId])

  // ======== helpers RRULE ========
  function inferFreqFromRRule(rr) {
    if (!rr) return ''
    const m = rr.match(/FREQ=([A-Z]+)/)
    return m ? m[1] : ''
  }
  function inferByDayFromRRule(rr) {
    if (!rr) return []
    const m = rr.match(/BYDAY=([A-Z,]+)/)
    return m ? m[1].split(',') : []
  }
  function buildRRuleString() {
    const hhmm = form.inicio_hora || '09:00'
    const [hh, mm] = hhmm.split(':')
    const parts = [`FREQ=${form.rrule_freq}`, `BYHOUR=${parseInt(hh, 10)}`, `BYMINUTE=${parseInt(mm, 10)}`]
    if (form.rrule_freq === 'WEEKLY' && form.rrule_dias_semana.length) {
      parts.push(`BYDAY=${form.rrule_dias_semana.join(',')}`)
    }
    return parts.join(';')
  }
  useEffect(() => {
    // sempre atualizar RRULE quando freq/dias/hora mudarem
    setForm(f => ({ ...f, rrule: buildRRuleString() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rrule_freq, form.rrule_dias_semana, form.inicio_hora])

  // ======== handlers ========
  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  function handleClienteText(text) {
    setForm(prev => ({ ...prev, cliente_busca: text }))
  }
  function handleClienteSelect(item) {
    setClienteId(item?.id || '')
    setClienteNome(item?.nome || '')
    setForm(prev => ({ ...prev, cliente_busca: item?.nome || '' }))
  }

  // canais múltiplos
  function toggleCanal(c) {
    setCanaisSel(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  // ======== validação ========
  function validate() {
    if (!clienteId) return 'Selecione um cliente.'
    if (!form.titulo?.trim()) return 'Informe o título.'
    if (!canaisSel.length) return 'Selecione ao menos um canal.'

    // data obrigatória
    if (!form.inicio_data) return 'Informe a data de início.'

    // hora obrigatória (passos de 10 minutos)
    if (!HHMM_RE.test(form.inicio_hora || '')) return 'Hora inválida (HH:MM).'
    const [, mmStr] = form.inicio_hora.split(':')
    const mm = parseInt(mmStr, 10)
    if (Number.isNaN(mm) || (mm % 10) !== 0) return 'A hora deve estar em intervalos de 10 minutos (ex.: 09:00, 09:10, 09:20).'

    if (!form.rrule?.trim()) return 'Configure a recorrência (RRULE).'
    return ''
  }

  // monta dtstart ISO usando a data + hora escolhidas
  function makeDtStartISO() {
    const d = form.inicio_data
    const h = form.inicio_hora || '09:00'
    return `${d}T${h}:00${SP_OFFSET}`
  }

  // ======== submit ========
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const err = validate()
      if (err) throw new Error(err)

      // fan-out por canal selecionado
      if (!isEdit) {
        for (let i = 0; i < canaisSel.length; i++) {
          const canal = canaisSel[i]
          const payload = buildPayloadPeriodico({
            cliente_id: clienteId,
            titulo: form.titulo,
            corpo: form.corpo,
            canal,
            rrule: form.rrule || buildRRuleString(),
            dtstart: makeDtStartISO(),
            ativa: form.ativa,
            meta: form.meta,
          })
          await createLembrete(payload)
        }
        navigate('/lembretes')
        return
      }

      // edição: atualiza o atual com o primeiro canal, cria extras para os demais
      const [canalFirst, ...rest] = canaisSel.length ? canaisSel : [undefined]
      if (!canalFirst) throw new Error('Selecione ao menos um canal.')

      const payload = {
        cliente_id: clienteId,
        titulo: form.titulo,
        corpo: form.corpo,
        canal: canalFirst,
        rrule: form.rrule || buildRRuleString(),
        dtstart: makeDtStartISO(),
        ativa: form.ativa,
        meta: form.meta,
      }
      await updateLembrete(id, payload)
      for (const extra of rest) {
        const p2 = { ...payload, canal: extra }
        await createLembrete(p2)
      }

      navigate('/lembretes')
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail || 'Falha ao criar lembrete.'
      if (status === 403) {
        setLimitMsg(detail)
        setShowUpgrade(true)
        sendFeedback({
          tipo: 'upgrade_reason',
          rating: null,
          comentario: detail,
          origem: 'upgrade_cta',
          contexto: { path: window.location.pathname }
        }).catch(() => {})
      } else {
        setError(detail)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePreview() {
    if (!isEdit) { setError('Salve o lembrete primeiro para visualizar o preview.'); return }
    try {
      setPreviewLoading(true)
      const data = await previewLembrete(id, 10)
      setPreview(data || { execucoes: [] })
    } catch (err) {
      setPreview({ execucoes: [], error: err?.response?.data?.detail || 'Falha ao gerar preview' })
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">{isEdit ? 'Editar Lembrete (Periódico)' : 'Novo Lembrete (Periódico)'}</h1>
          <div className="flex items-center gap-2">
            {isEdit && <Button variant="secondary" onClick={handlePreview}>Preview</Button>}
            <Button variant="ghost" onClick={() => navigate('/lembretes')}>Cancelar</Button>
            {/* Botão fora do <form>: chama handleSubmit manualmente */}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2 mx-auto" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {/* Cliente: travado na edição; livre (Autocomplete) em novo */}
            <div>
              <Label>Cliente</Label>
              {isEdit ? (
                <div className="p-2 rounded border bg-slate-50">{clienteNome || '—'}</div>
              ) : (
                <Autocomplete
                  value={form.cliente_busca}
                  onChangeText={handleClienteText}
                  onSelect={handleClienteSelect}
                  items={clientes}
                  getItemLabel={(c) => c?.nome || ''}
                  placeholder="Digite para buscar clientes..."
                  inputProps={{ id: 'cliente_busca', name: 'cliente_busca' }}
                />
              )}
              {!clienteId && (
                <p className="text-xs text-red-600 mt-1">Selecione um cliente.</p>
              )}
            </div>

            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" value={form.titulo} onChange={handleChange} required />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="corpo">Corpo (mensagem)</Label>
                <Button type="button" variant="secondary" onClick={() => setTplOpen(v => !v)}>
                  {tplOpen ? 'Fechar templates' : 'Importar template'}
                </Button>
              </div>

              {tplOpen && (
                <div className="mt-2 border rounded p-3" style={{ borderColor: 'var(--border)' }}>
                  <Autocomplete
                    value={tplBusca}
                    onChangeText={setTplBusca}
                    onSelect={handleUseTemplate}
                    items={tplItems}
                    getItemLabel={(t) => t?.titulo || ''}
                    placeholder="Buscar templates por título ou conteúdo..."
                    inputProps={{ id: 'template_busca', name: 'template_busca' }}
                  />
                  {tplLoading && <div className="skeleton h-6 w-full mt-2" />}
                  {tplError && <p className="text-sm text-red-600 mt-2">{tplError}</p>}
                  {!tplLoading && !tplError && tplItems.length === 0 && (
                    <p className="text-sm text-slate-500 mt-2">Nenhum template encontrado.</p>
                  )}
                </div>
              )}

              <Textarea
                id="corpo"
                name="corpo"
                value={form.corpo}
                onChange={handleChange}
                placeholder="Mensagem do lembrete... (ex.: Olá {{cliente.nome}}, sua fatura vence em {{fatura.vencimento}})"
              />
              {tplInfo && <p className="text-xs text-emerald-700 mt-1">{tplInfo}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Placeholders disponíveis (exemplos): {'{{cliente.nome}}'}, {'{{fatura.valor}}'}, {'{{fatura.vencimento}}'}
              </p>
            </div>

            {/* Canais múltiplos */}
            <div>
              <Label>Canais de envio</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {CANAIS.map(c => (
                  <label key={c} className="flex items-center gap-2">
                    <input type="checkbox" checked={canaisSel.includes(c)} onChange={() => toggleCanal(c)} />
                    <span className="capitalize">{c}</span>
                  </label>
                ))}
              </div>
              {!canaisSel.length && <p className="text-xs text-red-600 mt-1">Selecione ao menos um canal.</p>}
            </div>

            {/* Início: data + hora (hora com step 10 min) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="inicio_data">Data de início</Label>
                <Input
                  id="inicio_data"
                  name="inicio_data"
                  type="date"
                  value={form.inicio_data}
                  onChange={handleChange}
                />
                {!form.inicio_data && (
                  <p className="text-xs text-red-600 mt-1">Obrigatório.</p>
                )}
              </div>
              <div>
                <Label htmlFor="inicio_hora">Horário (passos de 10 min)</Label>
                <Input
                  id="inicio_hora"
                  name="inicio_hora"
                  type="time"
                  step={600}
                  value={form.inicio_hora}
                  onChange={handleChange}
                />
                {(!HHMM_RE.test(form.inicio_hora || '') || (parseInt((form.inicio_hora || '00:00').split(':')[1], 10) % 10 !== 0)) && (
                  <p className="text-xs text-red-600 mt-1">Formato HH:MM e múltiplos de 10 minutos.</p>
                )}
              </div>
            </div>

            {/* RRULE Builder */}
            <div className="border rounded p-3">
              <div className="font-medium mb-2">Recorrência</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Frequência</Label>
                  <Select
                    value={form.rrule_freq}
                    onChange={(e) => setForm(f => ({ ...f, rrule_freq: e.target.value }))}
                  >
                    {FREQS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </div>
                {form.rrule_freq === 'WEEKLY' && (
                  <div className="md:col-span-2">
                    <Label>Dias da semana</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {WEEKDAYS.map(d => {
                        const active = form.rrule_dias_semana.includes(d.v)
                        return (
                          <button
                            type="button"
                            key={d.v}
                            onClick={() => {
                              setForm(f => {
                                const set = new Set(f.rrule_dias_semana)
                                active ? set.delete(d.v) : set.add(d.v)
                                return { ...f, rrule_dias_semana: Array.from(set) }
                              })
                            }}
                            className={`px-2 py-1 rounded border text-sm ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300'}`}
                          >
                            {d.l}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <Label>RRULE gerada</Label>
                <Input value={form.rrule || buildRRuleString()} readOnly />
              </div>
            </div>

            {error && (
              <div className="mt-2 p-3 rounded bg-red-100 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/lembretes')}>Cancelar</Button>
              {/* Botão dentro do <form>: submit via onSubmit */}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Modal Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <Card className="p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="h2">Próximas Execuções</h2>
              <Button variant="ghost" onClick={() => setPreview(null)}>Fechar</Button>
            </div>

            {previewLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-6 w-full" />
                <div className="skeleton h-6 w-5/6" />
                <div className="skeleton h-6 w-2/3" />
              </div>
            ) : preview.error ? (
              <div className="p-3 rounded bg-red-100 text-red-700 border border-red-200">
                {preview.error}
              </div>
            ) : (preview.execucoes?.length ? (
              <ul className="space-y-1 text-sm">
                {preview.execucoes.map((e, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{new Date(e.scheduled_at).toLocaleString()}</span>
                    <span className="text-xs text-slate-500">{e.origem}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500">Nenhuma execução encontrada.</div>
            ))}

            <div className="mt-4 text-right">
              <Button onClick={() => setPreview(null)}>Ok</Button>
            </div>
          </Card>
        </div>
      )}

      {/* CTA de upgrade (sempre disponível para abrir quando 403) */}
      <UpgradeCTA
        visible={showUpgrade}
        reason={limitMsg}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}
