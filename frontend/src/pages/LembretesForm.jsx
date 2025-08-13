// src/pages/LembretesForm.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import Autocomplete from '../components/ui/Autocomplete'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'

import api from '../services/api'
import { getClientes } from '../services/clientes'
import { getTemplates } from '../services/templates'
import {
  createLembrete,
  updateLembrete,
  getLembrete,
  previewLembrete,
  buildPayloadPeriodico,
  buildPayloadFatura,
  CANAIS,
} from '../services/lembretes'

const HHMM_RE = /^\d{2}:\d{2}$/
const SP_OFFSET = '-03:00' // horário fixo SP

// faturas por cliente
async function getFaturasByCliente(clienteId) {
  const { data } = await api.get(`/faturas/?cliente_id=${clienteId}`)
  return Array.isArray(data) ? data : []
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
  const isEdit = useMemo(() => Boolean(id), [id])

  // 'periodico' | 'fatura'
  const [tipo, setTipo] = useState('periodico')

  const [clientes, setClientes] = useState([])
  const [faturas, setFaturas] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // canais múltiplos
  const [canaisSel, setCanaisSel] = useState([]) // ['whatsapp','email',...]

  const [form, setForm] = useState({
    // comuns
    cliente_id: '',
    cliente_busca: '',
    titulo: '',
    corpo: '',

    ativa: true,
    meta: {},

    // periódico (Início = data + hora)
    inicio_data: '',       // YYYY-MM-DD
    inicio_hora: '09:00',  // HH:MM
    rrule: '',             // string gerada pelo builder
    rrule_freq: 'MONTHLY',
    rrule_dias_semana: [], // ['MO','WE'] se semanal

    // fatura
    fatura_id: '',
    condicao: 'sempre',
    relativos: [], // UI-friendly (antes/depois) -> depois mapeamos para offsets
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

  // carregar clientes +, se edição, dados do lembrete
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: cli } = await getClientes()
        if (mounted) setClientes(Array.isArray(cli) ? cli : [])
      } catch { /* silencioso */ }

      if (!isEdit) return
      try {
        setLoading(true)
        const l = await getLembrete(id)
        const isPeriodico = Boolean(l.rrule)
        if (mounted) {
          setTipo(isPeriodico ? 'periodico' : 'fatura')

          // canais — backend entrega string; aqui tratamos como 1 canal selecionado
          setCanaisSel([l.canal].filter(Boolean))

          // dtstart -> quebra em data/hora
          let inicio_data = ''
          let inicio_hora = '09:00'
          if (l.dtstart) {
            const d = new Date(l.dtstart)
            inicio_data = d.toISOString().slice(0, 10)
            const hh = String(d.getHours()).padStart(2, '0')
            const mm = String(d.getMinutes()).padStart(2, '0')
            inicio_hora = `${hh}:${mm}`
          }

          // relativos (UI) a partir de offsets (before/after -> antes/depois)
          let relativos = []
          if (Array.isArray(l.offsets)) {
            relativos = l.offsets.map(o => ({
              quando: o.when === 'before' ? 'antes' : 'depois',
              dias: Number(o.days) || 0,
              hora: o.hora || '09:00',
              condicao: o.condicao || 'sempre',
            }))
          }

          setForm(prev => ({
            ...prev,
            cliente_id: l.cliente_id || '',
            cliente_busca: '',
            titulo: l.titulo || '',
            corpo: l.corpo || '',
            ativa: l.ativa ?? true,
            meta: l.meta || {},

            inicio_data,
            inicio_hora,
            rrule: l.rrule || '',
            rrule_freq: inferFreqFromRRule(l.rrule) || 'MONTHLY',
            rrule_dias_semana: inferByDayFromRRule(l.rrule),

            fatura_id: l.fatura_id || '',
            condicao: l.condicao || 'sempre',
            relativos,
          }))
        }
        if (!isPeriodico && l.cliente_id) {
          const fs = await getFaturasByCliente(l.cliente_id)
          if (mounted) setFaturas(fs)
        }
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Falha ao carregar lembrete')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, isEdit])

  // ao escolher cliente na aba fatura, carrega faturas
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (tipo !== 'fatura' || !form.cliente_id) { setFaturas([]); return }
      try {
        const fs = await getFaturasByCliente(form.cliente_id)
        if (mounted) setFaturas(fs)
      } catch {
        if (mounted) setFaturas([])
      }
    })()
    return () => { mounted = false }
  }, [tipo, form.cliente_id])

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
    if (tipo === 'periodico') {
      setForm(f => ({ ...f, rrule: buildRRuleString() }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, form.rrule_freq, form.rrule_dias_semana, form.inicio_hora])

  // ======== handlers ========
  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  function handleClienteText(text) {
    setForm(prev => ({ ...prev, cliente_busca: text, cliente_id: '' }))
  }
  function handleClienteSelect(item) {
    setForm(prev => ({ ...prev, cliente_id: item?.id || '', cliente_busca: item?.nome || '' }))
  }
  function switchTipo(novo) {
    setTipo(novo)
    if (novo === 'periodico') {
      // limpar fatura
      setForm(f => ({ ...f, fatura_id: '', condicao: 'sempre', relativos: [] }))
    } else {
      // limpar rrule
      setForm(f => ({ ...f, rrule: '', rrule_dias_semana: [] }))
    }
  }

  // canais múltiplos
  function toggleCanal(c) {
    setCanaisSel(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  // relativos (antes/depois)
  function addRelativo() {
    setForm(f => ({
      ...f,
      relativos: [...(f.relativos || []), { quando: 'antes', dias: 0, hora: '09:00', condicao: 'sempre' }],
    }))
  }
  function removeRelativo(idx) {
    setForm(f => ({ ...f, relativos: f.relativos.filter((_, i) => i !== idx) }))
  }
  function changeRelativo(idx, field, value) {
    setForm(f => {
      const arr = [...f.relativos]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...f, relativos: arr }
    })
  }

  // ======== validação ========
  function validate() {
    if (!form.cliente_id) return 'Selecione um cliente.'
    if (!form.titulo?.trim()) return 'Informe o título.'
    if (!canaisSel.length) return 'Selecione ao menos um canal.'
    if (tipo === 'periodico') {
      if (!form.inicio_data) return 'Informe a data de início.'
      if (!HHMM_RE.test(form.inicio_hora || '')) return 'Hora de início inválida (HH:MM).'
      if (!form.rrule?.trim()) return 'Configure a recorrência (RRULE).'
    } else {
      if (!form.fatura_id) return 'Selecione a fatura.'
      if (!Array.isArray(form.relativos) || form.relativos.length === 0) return 'Adicione ao menos um lembrete relativo.'
      for (let i = 0; i < form.relativos.length; i++) {
        const o = form.relativos[i]
        if (!['antes', 'depois'].includes(o.quando)) return `Relativo ${i + 1}: "quando" inválido.`
        if (typeof o.dias !== 'number' || o.dias < 0) return `Relativo ${i + 1}: "dias" inválido.`
        if (o.hora && !HHMM_RE.test(o.hora)) return `Relativo ${i + 1}: "hora" deve ser HH:MM.`
        if (o.condicao && !['sempre', 'se_nao_cumprido'].includes(o.condicao)) {
          return `Relativo ${i + 1}: "condição" inválida.`
        }
      }
    }
    return ''
  }

  // monta dtstart ISO a partir de data + hora (SP fixo)
  function makeDtStartISO() {
    const d = form.inicio_data
    const h = form.inicio_hora || '09:00'
    if (!d) return ''
    return `${d}T${h}:00${SP_OFFSET}`
  }

  // mapeia relativos -> offsets backend
  function mapRelativosToOffsets() {
    return (form.relativos || []).map(r => ({
      when: r.quando === 'antes' ? 'before' : 'after',
      days: Number(r.dias) || 0,
      hora: r.hora || '09:00',
      condicao: r.condicao || 'sempre',
    }))
  }

  // ======== submit ========
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const err = validate()
      if (err) throw new Error(err)

      // fan-out por canal selecionado
      if (!isEdit) {
        for (let i = 0; i < canaisSel.length; i++) {
          const canal = canaisSel[i]
          if (tipo === 'periodico') {
            const payload = buildPayloadPeriodico({
              cliente_id: form.cliente_id,
              titulo: form.titulo,
              corpo: form.corpo,
              canal,
              rrule: form.rrule || buildRRuleString(),
              dtstart: makeDtStartISO(),
              ativa: form.ativa,
              meta: form.meta,
            })
            await createLembrete(payload)
          } else {
            const payload = buildPayloadFatura({
              cliente_id: form.cliente_id,
              fatura_id: form.fatura_id,
              titulo: form.titulo,
              corpo: form.corpo,
              canal,
              offsets: mapRelativosToOffsets(),
              ativa: form.ativa,
              condicao: form.condicao,
              meta: form.meta,
            })
            await createLembrete(payload)
          }
        }
        navigate('/lembretes')
        return
      }

      // edição: atualiza o atual com o primeiro canal, cria extras para os demais
      const [canalFirst, ...rest] = canaisSel.length ? canaisSel : [undefined]
      if (!canalFirst) throw new Error('Selecione ao menos um canal.')

      if (tipo === 'periodico') {
        const payload = {
          cliente_id: form.cliente_id,
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
      } else {
        const payload = {
          cliente_id: form.cliente_id,
          fatura_id: form.fatura_id,
          titulo: form.titulo,
          corpo: form.corpo,
          canal: canalFirst,
          offsets: mapRelativosToOffsets(),
          ativa: form.ativa,
          condicao: form.condicao,
          meta: form.meta,
        }
        await updateLembrete(id, payload)
        for (const extra of rest) {
          const p2 = { ...payload, canal: extra }
          await createLembrete(p2)
        }
      }

      navigate('/lembretes')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Falha ao salvar lembrete')
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

  // ======== UI ========
  function Tab({ active, onClick, children }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 rounded-t-xl border ${active ? 'bg-white border-b-white font-semibold' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">{isEdit ? 'Editar Lembrete' : 'Novo Lembrete'}</h1>
          <div className="flex items-center gap-2">
            {isEdit && <Button variant="secondary" onClick={handlePreview}>Preview</Button>}
            <Button variant="ghost" onClick={() => navigate('/lembretes')}>Cancelar</Button>
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
            {/* Abas */}
            <div className="flex gap-2">
              <Tab active={tipo === 'periodico'} onClick={() => switchTipo('periodico')}>Periódico (RRULE)</Tab>
              <Tab active={tipo === 'fatura'} onClick={() => switchTipo('fatura')}>Fatura (Lembretes relativos)</Tab>
            </div>

            {/* Comuns */}
            <div>
              <Label>Cliente</Label>
              <Autocomplete
                value={form.cliente_busca}
                onChangeText={handleClienteText}
                onSelect={handleClienteSelect}
                items={clientes}
                getItemLabel={(c) => c?.nome || ''}
                placeholder="Digite para buscar clientes..."
                inputProps={{ id: 'cliente_busca', name: 'cliente_busca' }}
              />
              {!form.cliente_id && form.cliente_busca && (
                <p className="text-xs text-slate-500 mt-1">Selecione um item da lista para vincular.</p>
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

            {/* Específico de cada aba */}
            {tipo === 'periodico' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="inicio_data">Início (data)</Label>
                    <Input
                      id="inicio_data"
                      name="inicio_data"
                      type="date"
                      value={form.inicio_data}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inicio_hora">Início (hora)</Label>
                    <Input
                      id="inicio_hora"
                      name="inicio_hora"
                      value={form.inicio_hora}
                      onChange={handleChange}
                      placeholder="09:00"
                    />
                    {!HHMM_RE.test(form.inicio_hora || '') && (
                      <p className="text-xs text-red-600 mt-1">Formato HH:MM</p>
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
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fatura_id">Fatura</Label>
                    <Select
                      id="fatura_id"
                      name="fatura_id"
                      value={form.fatura_id}
                      onChange={handleChange}
                      disabled={!form.cliente_id}
                    >
                      <option value="">{form.cliente_id ? 'Selecione...' : 'Selecione antes um cliente'}</option>
                      {faturas.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.vencimento} — R$ {Number(f.valor).toFixed(2)} ({f.status})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condicao">Condição (default)</Label>
                    <Select
                      id="condicao"
                      name="condicao"
                      value={form.condicao}
                      onChange={handleChange}
                    >
                      <option value="sempre">sempre</option>
                      <option value="se_nao_cumprido">se_nao_cumprido</option>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Cada lembrete relativo pode sobrescrever essa condição.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Lembretes relativos ao vencimento</h3>
                  <Button type="button" variant="secondary" onClick={addRelativo}>Adicionar</Button>
                </div>

                {(form.relativos || []).length === 0 ? (
                  <div className="text-slate-500">Nenhum lembrete relativo adicionado.</div>
                ) : (
                  <div className="space-y-3">
                    {form.relativos.map((o, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_1fr_100px] gap-3 items-end">
                        <div>
                          <Label>Quando</Label>
                          <Select
                            value={o.quando}
                            onChange={(e) => changeRelativo(idx, 'quando', e.target.value)}
                          >
                            <option value="antes">antes</option>
                            <option value="depois">depois</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Dias</Label>
                          <Input
                            type="number"
                            min={0}
                            value={o.dias}
                            onChange={(e) => changeRelativo(idx, 'dias', Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Hora (HH:MM)</Label>
                          <Input
                            value={o.hora || ''}
                            onChange={(e) => changeRelativo(idx, 'hora', e.target.value)}
                            placeholder="09:00"
                          />
                          {!(!o.hora || HHMM_RE.test(o.hora)) && (
                            <p className="text-xs text-red-600 mt-1">Formato HH:MM</p>
                          )}
                        </div>
                        <div>
                          <Label>Condição</Label>
                          <Select
                            value={o.condicao || 'sempre'}
                            onChange={(e) => changeRelativo(idx, 'condicao', e.target.value)}
                          >
                            <option value="sempre">sempre</option>
                            <option value="se_nao_cumprido">se_nao_cumprido</option>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="danger" onClick={() => removeRelativo(idx)}>Remover</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-2 p-3 rounded bg-red-100 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/lembretes')}>Cancelar</Button>
              <Button type="submit" disabled={submitting} onClick={handleSubmit}>
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
    </div>
  )
}
