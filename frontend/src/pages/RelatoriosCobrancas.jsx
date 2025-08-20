// src/pages/RelatoriosCobrancas.jsx (versão aprimorada)
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FileSpreadsheet, LineChart as LineChartIcon, BarChart3 } from 'lucide-react'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import Autocomplete from '../components/ui/Autocomplete'
import { getClientes } from '../services/clientes'

const STATUSES = ['pendente', 'pago', 'atrasado', 'cancelado']
const CANAIS = ['whatsapp', 'email', 'sms']
const RECORRENCIAS = ['unica', 'mensal', 'semanal']
const PAGAMENTOS = ['pix', 'boleto', 'cartao']

const toISO = (d) => d.toISOString().slice(0, 10)
const startOfMonth = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1) }
const endOfMonth = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth() + 1, 0) }

function buildQS(obj) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach(item => params.append(k, item))
    else params.append(k, v)
  }
  return params.toString()
}

function exportCsv(filename, rows) {
  if (!rows?.length) return
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const esc = (v) => {
    if (v == null) return ''
    const s = String(v)
    return (s.includes('"') || s.includes(',') || s.includes('\n')) ? '"' + s.replaceAll('"', '""') + '"' : s
  }
  const bom = '\uFEFF'
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(','))).join('\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

// ---- helpers para granularidade no cliente ----
function startOfWeekISO(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = (d.getDay() + 6) % 7 // 0=segunda
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return monday.toISOString().slice(0, 10)
}
function monthKey(dateStr) {
  return dateStr.slice(0, 7) + '-01'
}
function groupTimeSeries(series, gran) {
  if (!Array.isArray(series)) return []
  if (gran === 'day') return [...series]
  const map = new Map()
  for (const item of series) {
    const key = gran === 'week' ? startOfWeekISO(item.date) : monthKey(item.date)
    const prev = map.get(key) || { date: key, count: 0, total_valor: 0 }
    prev.count += Number(item.count || 0)
    prev.total_valor += Number(item.total_valor || 0)
    map.set(key, prev)
  }
  return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date))
}

export default function RelatoriosCobrancas() {
  // ===== State filtros =====
  const [filters, setFilters] = useState({
    data_base: 'vencimento',
    start_date: toISO(startOfMonth()),
    end_date: toISO(endOfMonth()),
    status: [],                 // inicial sem seleção
    cliente_id: '',
    cliente_nome: '',
    min_valor: '',
    max_valor: '',
    canal_envio: [],            // inicial sem seleção
    recorrencia: [],            // inicial sem seleção
    forma_pagamento: [],        // inicial sem seleção
    sort_by: 'vencimento',
    sort_dir: 'desc',
    page: 1,
    page_size: 20,
  })

  // ===== Dados =====
  const [loading, setLoading] = useState(false)
  const [porStatus, setPorStatus] = useState([])
  const [evolucao, setEvolucao] = useState([])
  const [itens, setItens] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const primary = '#5E2CA5'; const secondary = '#4CAF50'

  // ===== Clientes para Autocomplete =====
  const [clientes, setClientes] = useState([])
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await getClientes()
        if (mounted) setClientes(Array.isArray(data) ? data : [])
      } catch (e) {}
    })()
    return () => { mounted = false }
  }, [])

  function onClienteText(text) {
    setFilters(prev => ({ ...prev, cliente_nome: text, cliente_id: '' , page: 1}))
  }
  function onClienteSelect(item) {
    setFilters(prev => ({ ...prev, cliente_id: item?.id || '', cliente_nome: item?.nome || '', page: 1 }))
  }

  // ===== Fetch =====
  async function fetchData(signal) {
    setError('')
    const qs = buildQS({ ...filters, cliente_nome: undefined })
    const url = `/relatorios/cobrancas?${qs}`
    const { data } = await api.get(url, { signal })
    setPorStatus(data.por_status || [])
    setEvolucao(data.evolucao || [])
    setItens(data.itens || [])
    setTotal(data.total || 0)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    fetchData(ctrl.signal).catch((e) => setError(e?.response?.data?.detail || e.message)).finally(() => setLoading(false))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  // ===== Helpers UI =====
  const toggleMulti = (key, value) => {
    setFilters(prev => {
      const cur = new Set(prev[key] || [])
      cur.has(value) ? cur.delete(value) : cur.add(value)
      return { ...prev, [key]: Array.from(cur), page: 1 }
    })
  }
  const set = (patch) => setFilters(prev => ({ ...prev, ...patch }))

  // ===== Métricas dos gráficos =====
  const [metricStatus, setMetricStatus] = useState('count') // 'count' | 'total_valor' | 'ticket_medio'
  const dataStatus = useMemo(() => porStatus.map(s => ({
    ...s,
    ticket_medio: s.count ? (Number(s.total_valor || 0) / Number(s.count || 1)) : 0
  })), [porStatus])

  const [metricEvol, setMetricEvol] = useState('count')     // 'count' | 'total_valor' | 'ticket_medio'
  const [granularidade, setGranularidade] = useState('day') // 'day' | 'week' | 'month'
  const evolucaoData = useMemo(() => {
    const base = evolucao.map(d => ({
      date: d.date,
      count: Number(d.count || 0),
      total_valor: Number(d.total_valor || 0),
    }))
    const grouped = groupTimeSeries(base, granularidade)
    return grouped.map(d => ({
      ...d,
      ticket_medio: d.count ? (d.total_valor / d.count) : 0
    }))
  }, [evolucao, granularidade])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios de Cobranças</h1>
          <p className="text-slate-500">Filtros avançados, gráficos e exportação CSV.</p>
        </div>
        <Button onClick={() => exportCsv('faturas.csv', itens)}>
          <FileSpreadsheet className="w-4 h-4 mr-2"/> Exportar faturas (CSV)
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>Data inicial</Label>
            <Input type="date" value={filters.start_date} onChange={(e) => set({ start_date: e.target.value, page: 1 })} />
          </div>
          <div>
            <Label>Data final</Label>
            <Input type="date" value={filters.end_date} onChange={(e) => set({ end_date: e.target.value, page: 1 })} />
          </div>
          <div>
            <Label>Base da data</Label>
            <Select id="data_base" name="data_base" value={filters.data_base} onChange={(e) => set({ data_base: e.target.value, page: 1 })}>
              <option value="vencimento">Vencimento</option>
              <option value="criacao">Criação</option>
              <option value="atualizacao">Atualização</option>
            </Select>
          </div>
          <div>
            <Label>Ordenação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select id="sort_by" name="sort_by" value={filters.sort_by} onChange={(e) => set({ sort_by: e.target.value })}>
                <option value="vencimento">Vencimento</option>
                <option value="valor">Valor</option>
                <option value="created_at">Criação</option>
                <option value="updated_at">Atualização</option>
              </Select>
              <Select id="sort_dir" name="sort_dir" value={filters.sort_dir} onChange={(e) => set({ sort_dir: e.target.value })}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Autocomplete Cliente */}
          <div className="md:col-span-2">
            <Label htmlFor="cliente_busca">Cliente</Label>
            <Autocomplete
              value={filters.cliente_nome}
              onChangeText={(t) => onClienteText(t)}
              onSelect={(item) => onClienteSelect(item)}
              items={clientes}
              getItemLabel={(c) => c?.nome || ''}
              placeholder="Digite para buscar clientes..."
              inputProps={{ id: 'cliente_busca', name: 'cliente_busca' }}
            />
          </div>
          <div>
            <Label>Valor (min)</Label>
            <Input type="number" step="0.01" value={filters.min_valor} onChange={(e) => set({ min_valor: e.target.value, page: 1 })} />
          </div>
          <div>
            <Label>Valor (max)</Label>
            <Input type="number" step="0.01" value={filters.max_valor} onChange={(e) => set({ max_valor: e.target.value, page: 1 })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => toggleMulti('status', s)} className={`px-3 py-1 rounded-full border ${filters.status.includes(s) ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Canal de envio</Label>
            <div className="flex flex-wrap gap-2">
              {CANAIS.map(s => (
                <button key={s} type="button" onClick={() => toggleMulti('canal_envio', s)} className={`px-3 py-1 rounded-full border ${filters.canal_envio.includes(s) ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Recorrência</Label>
            <div className="flex flex-wrap gap-2">
              {RECORRENCIAS.map(s => (
                <button key={s} type="button" onClick={() => toggleMulti('recorrencia', s)} className={`px-3 py-1 rounded-full border ${filters.recorrencia.includes(s) ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Forma de pagamento</Label>
          <div className="flex flex-wrap gap-2">
            {PAGAMENTOS.map(s => (
              <button key={s} type="button" onClick={() => toggleMulti('forma_pagamento', s)} className={`px-3 py-1 rounded-full border ${filters.forma_pagamento.includes(s) ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <Label>Itens por página</Label>
            <Select value={String(filters.page_size)} onChange={(e) => set({ page_size: Number(e.target.value), page: 1 })}>
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div>
            <Label>Página</Label>
            <Input type="number" min={1} value={filters.page} onChange={(e) => set({ page: Number(e.target.value || 1) })} />
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-semibold">Cobranças por status</h3>
            </div>
            <select className="text-sm border rounded px-2 py-1" value={metricStatus} onChange={(e) => setMetricStatus(e.target.value)}>
              <option value="count">Quantidade</option>
              <option value="total_valor">Valor total</option>
              <option value="ticket_medio">Ticket médio</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={metricStatus} name={metricStatus === 'count' ? 'Qtde' : metricStatus === 'total_valor' ? 'Valor' : 'Ticket médio'} fill={primary} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5" />
              <h3 className="font-semibold">Evolução no período</h3>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-sm border rounded px-2 py-1" value={granularidade} onChange={(e)=>setGranularidade(e.target.value)}>
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
              <select className="text-sm border rounded px-2 py-1" value={metricEvol} onChange={(e)=>setMetricEvol(e.target.value)}>
                <option value="count">Quantidade</option>
                <option value="total_valor">Valor total</option>
                <option value="ticket_medio">Ticket médio</option>
              </select>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={metricEvol} name={metricEvol === 'count' ? 'Qtde' : metricEvol === 'total_valor' ? 'Valor' : 'Ticket médio'} stroke={primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Lista de faturas ({total})</h3>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                {['Fatura (ID)','Cobrança','Cliente','Valor','Vencimento','Status','Canal','Pagamento'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens?.length ? itens.map((r, i) => (
                <tr key={r.id || i} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.cobranca_titulo || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.cliente}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.valor}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.vencimento}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.canal_envio ?? '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.forma_pagamento ?? '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-3 shadow">Carregando…</div>
        </div>
      )}
    </div>
  )
}
