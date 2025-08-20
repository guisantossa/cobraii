// src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import {
  getOverview,
  getEnviosSeries,
  getFaturasStatus,
  getConversao,
} from '../services/analytics'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

function PeriodoPicker({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-xs">
      <option value="7">Últimos 7 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="90">Últimos 90 dias</option>
    </Select>
  )
}
function JanelaPicker({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-xs">
      <option value="3">Conversão janela 3d</option>
      <option value="7">Conversão janela 7d</option>
      <option value="14">Conversão janela 14d</option>
    </Select>
  )
}

/** Paleta via CSS vars (definidas no :root) */
const C = {
  whatsapp: 'var(--secondary)', // verde
  email: 'var(--primary)',      // roxo
  sms: 'var(--accent)',         // amarelo
  pendente: 'var(--accent)',
  pago: 'var(--secondary)',
  atrasado: 'var(--danger)',
  cancelado: 'var(--muted)',
  envios: 'var(--primary)',
  pagos: 'var(--secondary)',
  axis: 'rgba(148,163,184,0.6)', // slate-400 opacidade
  grid: 'rgba(148,163,184,0.25)',
}

/** Helpers de formatação */
const fmtNum = (n) =>
  Number.isFinite(+n) ? Intl.NumberFormat('pt-BR').format(+n) : n
const fmtMoeda = (n) =>
  Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(+n || 0)

/** Tooltip custom “glass” */
function TooltipBox({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl shadow-soft border border-slate-200 bg-white/90 backdrop-blur p-2">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="space-y-0.5">
        {payload.map((p) => {
          const v = mode === 'money' ? fmtMoeda(p.value) : fmtNum(p.value)
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-[13px] text-slate-700">{p.name}</span>
              <span className="ml-auto font-semibold text-slate-900">{v}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Util: gera os últimos 6 meses (inclui mês atual) */
function buildLast6Months(end = new Date()) {
  const list = []
  const d = new Date(end.getFullYear(), end.getMonth(), 1) // 1º dia do mês atual
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
      .format(dt)
      .replace('.', '')
    list.push({ key, label })
  }
  return list
}

/** Normaliza a resposta das faturas para preencher 6 meses e garantir chaves */
function normalizeFaturas(items, months6) {
  // base zerada
  const base = Object.fromEntries(
    months6.map((m) => [
      m.key,
      { monthKey: m.key, monthLabel: m.label, pendente: 0, pago: 0, atrasado: 0, cancelado: 0 },
    ]),
  )

  // tenta mapear itens por YYYY-MM
  ;(items || []).forEach((it) => {
    // tenta extrair chave de mês
    const raw = it.month ?? it.mes ?? it.key ?? ''
    const monthKey = String(raw).slice(0, 7) // espera 'YYYY-MM'
    if (base[monthKey]) {
      base[monthKey].pendente = it.pendente ?? base[monthKey].pendente
      base[monthKey].pago = it.pago ?? base[monthKey].pago
      base[monthKey].atrasado = it.atrasado ?? base[monthKey].atrasado
      base[monthKey].cancelado = it.cancelado ?? base[monthKey].cancelado
    }
  })

  // retorna na ordem dos months6
  return months6.map((m) => base[m.key])
}

export default function Dashboard() {
  const [days, setDays] = useState('30')
  const [janela, setJanela] = useState('7')

  const [cards, setCards] = useState(null)
  const [enviosSeries, setEnviosSeries] = useState([])
  const [faturasStatus, setFaturasStatus] = useState([])
  const [conv, setConv] = useState({ taxa: 0, items: [] })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // calculo memoizado dos últimos 6 meses
  const months6 = useMemo(() => buildLast6Months(new Date()), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError('')

        // período geral (cards, envios, conversão)
        const ate = new Date()
        const desde = new Date()
        desde.setDate(ate.getDate() - Number(days))
        const toISO = (d) => d.toISOString().slice(0, 10)
        const params = { desde: toISO(desde), ate: toISO(ate) }

        // período específico das faturas: últimos 6 meses
        const firstMonth = months6[0]
        const desde6 = new Date(firstMonth.key + '-01T00:00:00')
        const params6 = { desde: toISO(desde6), ate: toISO(ate) }

        const [ov, ts, fs, cv] = await Promise.all([
          getOverview(params),
          getEnviosSeries(params),
          getFaturasStatus(params6), // força 6 meses
          getConversao({ ...params, janela_dias: Number(janela) }),
        ])

        if (!alive) return

        setCards(ov.data)
        setEnviosSeries(Array.isArray(ts.data?.items) ? ts.data.items : [])
        // normaliza para 6 meses com zero-fill
        const fsItems = Array.isArray(fs.data?.items) ? fs.data.items : []
        setFaturasStatus(normalizeFaturas(fsItems, months6))
        setConv(cv.data || { taxa: 0, items: [] })
      } catch (err) {
        if (alive)
          setError(err?.response?.data?.detail || 'Falha ao carregar dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // months6 é estático (memo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, janela, months6])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1 font-heading">Dashboard</h1>
        <div className="flex items-center gap-2">
          <PeriodoPicker value={days} onChange={setDays} />
          <JanelaPicker value={janela} onChange={setJanela} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 rounded-2xl shadow-soft">
              <div className="skeleton h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-4 text-red-600 rounded-2xl shadow-soft">{error}</Card>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Clientes</div>
              <div className="text-2xl font-semibold text-primary">
                {cards?.clientes_total ?? '—'}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Faturas abertas</div>
              <div className="text-2xl font-semibold text-danger">
                {cards?.faturas_abertas ?? '—'}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Lembretes ativos</div>
              <div className="text-2xl font-semibold text-primary">
                {cards?.lembretes_ativos ?? '—'}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Envios no período</div>
              <div className="text-2xl font-semibold text-primary">
                {cards?.envios_periodo ?? '—'}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Entregues no período</div>
              <div className="text-2xl font-semibold text-secondary">
                {cards?.entregues_periodo ?? '—'}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Taxa de sucesso</div>
              <div className="text-2xl font-semibold text-secondary">
                {`${Math.round((cards?.taxa_sucesso || 0) * 100)}%`}
              </div>
            </Card>

            <Card className="p-4 md:col-span-3 rounded-2xl shadow-soft">
              <div className="text-sm text-textsoft">Valor pago no período</div>
              <div className="text-2xl font-semibold text-secondary">
                {fmtMoeda(cards?.valor_pago_periodo || 0)}
              </div>
            </Card>
          </div>

          {/* Gráfico 1: Envios por dia por canal (AreaChart com gradiente) */}
          <Card className="p-4 rounded-2xl shadow-soft">
            <div className="mb-2 font-semibold">Envios por dia por canal</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={enviosSeries}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gWhats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.whatsapp} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.whatsapp} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.email} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.email} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gSms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.sms} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.sms} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke={C.axis} tickLine={false} />
                  <YAxis allowDecimals={false} stroke={C.axis} tickLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="whatsapp"
                    name="WhatsApp"
                    stroke={C.whatsapp}
                    fill="url(#gWhats)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="email"
                    name="Email"
                    stroke={C.email}
                    fill="url(#gEmail)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="sms"
                    name="SMS"
                    stroke={C.sms}
                    fill="url(#gSms)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico 2: Faturas por status (mensal) — BARRAS AGRUPADAS em 6 meses */}
          <Card className="p-4 rounded-2xl shadow-soft">
            <div className="mb-2 font-semibold">Faturas por status (últimos 6 meses)</div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={faturasStatus}
                  margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
                >
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    stroke={C.axis}
                    tickLine={false}
                    axisLine={{ stroke: C.axis }}
                  />
                  <YAxis allowDecimals={false} stroke={C.axis} tickLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend />
                  {/* barras AGRUPADAS (sem stackId) */}
                  <Bar dataKey="pendente" name="Pendente" fill={C.pendente} radius={[8,8,0,0]} />
                  <Bar dataKey="pago" name="Pago" fill={C.pago} radius={[8,8,0,0]} />
                  <Bar dataKey="atrasado" name="Atrasado" fill={C.atrasado} radius={[8,8,0,0]} />
                  <Bar dataKey="cancelado" name="Cancelado" fill={C.cancelado} radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico 3: Conversão (área dupla) */}
          <Card className="p-4 rounded-2xl shadow-soft">
            <div className="mb-2 font-semibold">
              Conversão de envios em pagamentos (janela {conv?.janela_dias || janela}d) — taxa {Math.round((conv?.taxa || 0) * 100)}%
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={conv?.items || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gEnvios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.envios} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.envios} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gPagos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.pagos} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.pagos} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke={C.axis} tickLine={false} />
                  <YAxis allowDecimals={false} stroke={C.axis} tickLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="envios"
                    name="Envios"
                    stroke={C.envios}
                    fill="url(#gEnvios)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="pagos"
                    name="Pagos"
                    stroke={C.pagos}
                    fill="url(#gPagos)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
