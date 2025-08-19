// src/pages/LembretesOffsetsForm.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'

import api from '../services/api'
import { getCobranca } from '../services/cobrancas'
import { getFaturasByCobranca } from '../services/faturas'
import {
  createLembrete,
  buildPayloadFatura,
  CANAIS,
} from '../services/lembretes'

const HHMM_RE = /^\d{2}:\d{2}$/

export default function LembretesOffsetsForm() {
  const navigate = useNavigate()
  const params = useParams()
  const cobrancaId = params.cobrancaId || params.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bloqueadoMsg, setBloqueadoMsg] = useState('')

  const [cobranca, setCobranca] = useState(null)
  const [faturas, setFaturas] = useState([])

  // campos do formulário (apenas offsets/fatura)
  const [form, setForm] = useState({
    cliente_id: '',
    fatura_id: '',
    titulo: '',
    corpo: '',
    condicao: 'sempre',
    relativos: [], // { quando: 'antes'|'depois', dias: number, hora: 'HH:MM', condicao?: 'sempre'|'se_nao_cumprido' }
  })

  // canais (múltiplos)
  const [canaisSel, setCanaisSel] = useState(['whatsapp'])

  // ======= carregamento inicial =======
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        // 1) carrega cobrança + faturas
        const [cRes, fRes] = await Promise.all([
          getCobranca(cobrancaId),
          getFaturasByCobranca(cobrancaId),
        ])
        if (!mounted) return

        const c = cRes?.data || null
        const fs = Array.isArray(fRes?.data) ? fRes.data : []

        setCobranca(c)
        setFaturas(fs)

       

        // 3) pré-preenche formulário a partir da cobrança
        setForm(prev => ({
          ...prev,
          cliente_id: c?.cliente_id || '',
          // tenta selecionar a próxima fatura pendente por padrão (ou a primeira)
          fatura_id: pickDefaultFatura(fs),
          titulo: defaultTitulo(c),
          corpo: defaultCorpo(c),
          condicao: 'sempre',
          relativos: defaultRelativos(fs),
        }))
      } catch (err) {
        if (!mounted) return
        setError(err?.response?.data?.detail || 'Falha ao carregar dados')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [cobrancaId])

  // ======= defaults =======
  function pickDefaultFatura(fs) {
    if (!Array.isArray(fs) || fs.length === 0) return ''
    // prioriza pendente (sem data_pagamento) mais próxima
    const pendentes = fs.filter(f => !f.data_pagamento)
    const base = pendentes.length ? pendentes : fs
    const sorted = [...base].sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
    return sorted[0]?.id || ''
  }

  function defaultTitulo(c) {
    const titulo = c?.titulo || 'Lembrete de cobrança'
    return `Lembrete: ${titulo}`
  }

  function defaultCorpo(c) {
    // simples e útil; usuário pode editar antes de salvar
    const base = c?.descricao || 'Sua fatura está próxima do vencimento.'
    return `Olá {{cliente.nome}}, ${base} Valor: {{fatura.valor}}. Vencimento: {{fatura.vencimento}}.`
  }

  function defaultRelativos(fs) {
    // regra leve: 3 lembretes = -3 dias, -1 dia, +1 dia (pós-vencimento)
    // usuário pode editar/remover
    return [
      { quando: 'antes', dias: 3, hora: '09:00', condicao: 'sempre' },
      { quando: 'antes', dias: 1, hora: '09:00', condicao: 'sempre' },
      { quando: 'depois', dias: 1, hora: '09:00', condicao: 'se_nao_cumprido' },
    ]
  }

  // ======= handlers =======
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function toggleCanal(c) {
    setCanaisSel(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

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

  // ======= validação =======
  function validate() {
    if (bloqueadoMsg) return bloqueadoMsg
    if (!form.cliente_id) return 'Cliente não identificado.'
    if (!form.fatura_id) return 'Selecione a fatura.'
    if (!form.titulo?.trim()) return 'Informe o título.'
    if (!canaisSel.length) return 'Selecione ao menos um canal.'
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
    return ''
  }

  function mapRelativosToOffsets() {
    return (form.relativos || []).map(r => ({
      when: r.quando === 'antes' ? 'before' : 'after',
      days: Number(r.dias) || 0,
      hora: r.hora || '09:00',
      condicao: r.condicao || 'sempre',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const err = validate()
      if (err) throw new Error(err)

      // fan-out por canal
      for (const canal of canaisSel) {
        const payload = buildPayloadFatura({
          cliente_id: form.cliente_id,
          fatura_id: form.fatura_id,
          titulo: form.titulo,
          corpo: form.corpo,
          canal,
          offsets: mapRelativosToOffsets(),
          ativa: true,
          condicao: form.condicao,
          meta: {
            origem: 'cobranca',
            cobranca_id: cobrancaId,
          },
        })
        await createLembrete(payload)
      }

      navigate('/lembretes')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Falha ao salvar lembrete')
    } finally {
      setSubmitting(false)
    }
  }

  const fmtBRL = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0))

  const fmtDate = (iso) => {
    if (!iso) return '-'
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">Novo Lembrete (Offsets da Fatura)</h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
            <Button onClick={handleSubmit} disabled={submitting || !!bloqueadoMsg}>
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {/* Cabeçalho com dados da cobrança */}
            <div className="rounded border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="font-medium mb-2">Cobrança</div>
              {cobranca ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Título: </span>{cobranca.titulo}</div>
                  <div><span className="text-slate-500">Valor: </span>{fmtBRL(cobranca.valor)}</div>
                  <div><span className="text-slate-500">Cliente: </span>{cobranca?.cliente?.nome || cobranca?.cliente_nome_avulso || '-'}</div>
                  <div><span className="text-slate-500">Vencimento: </span>{fmtDate(cobranca.vencimento)}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">—</div>
              )}
            </div>

            {bloqueadoMsg && (
              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-800">
                {bloqueadoMsg}
              </div>
            )}

            {/* Fatura alvo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fatura_id">Fatura</Label>
                <Select
                  id="fatura_id"
                  name="fatura_id"
                  value={form.fatura_id}
                  onChange={handleChange}
                  disabled={!!bloqueadoMsg}
                >
                  <option value="">{faturas.length ? 'Selecione...' : 'Sem faturas'}</option>
                  {faturas.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.vencimento} — R$ {Number(f.valor).toFixed(2)} {f.data_pagamento ? '(paga)' : '(pendente)'}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="condicao">Condição padrão</Label>
                <Select
                  id="condicao"
                  name="condicao"
                  value={form.condicao}
                  onChange={handleChange}
                  disabled={!!bloqueadoMsg}
                >
                  <option value="sempre">sempre</option>
                  <option value="se_nao_cumprido">se_nao_cumprido</option>
                </Select>
              </div>
            </div>

            {/* Título/Corpo */}
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                placeholder="Ex.: Lembrete de fatura"
                disabled={!!bloqueadoMsg}
                required
              />
            </div>

            <div>
              <Label htmlFor="corpo">Corpo (mensagem)</Label>
              <Textarea
                id="corpo"
                name="corpo"
                value={form.corpo}
                onChange={handleChange}
                placeholder="Mensagem com placeholders ({{cliente.nome}}, {{fatura.valor}}, {{fatura.vencimento}})"
                disabled={!!bloqueadoMsg}
              />
              <p className="text-xs text-slate-500 mt-1">
                Placeholders: {'{{cliente.nome}}'}, {'{{fatura.valor}}'}, {'{{fatura.vencimento}}'}
              </p>
            </div>

            {/* Canais */}
            <div>
              <Label>Canais de envio</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {CANAIS.map(c => (
                  <label key={c} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={canaisSel.includes(c)}
                      onChange={() => toggleCanal(c)}
                      disabled={!!bloqueadoMsg}
                    />
                    <span className="capitalize">{c}</span>
                  </label>
                ))}
              </div>
              {!canaisSel.length && <p className="text-xs text-red-600 mt-1">Selecione ao menos um canal.</p>}
            </div>

            {/* Offsets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lembretes relativos ao vencimento</h3>
                <Button type="button" variant="secondary" onClick={addRelativo} disabled={!!bloqueadoMsg}>Adicionar</Button>
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
                          disabled={!!bloqueadoMsg}
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
                          disabled={!!bloqueadoMsg}
                        />
                      </div>
                      <div>
                        <Label>Hora (HH:MM)</Label>
                        <Input
                          value={o.hora || ''}
                          onChange={(e) => changeRelativo(idx, 'hora', e.target.value)}
                          placeholder="09:00"
                          disabled={!!bloqueadoMsg}
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
                          disabled={!!bloqueadoMsg}
                        >
                          <option value="sempre">sempre</option>
                          <option value="se_nao_cumprido">se_nao_cumprido</option>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="danger" onClick={() => removeRelativo(idx)} disabled={!!bloqueadoMsg}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-2 p-3 rounded bg-red-100 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" disabled={submitting || !!bloqueadoMsg} onClick={handleSubmit}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
