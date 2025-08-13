// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { getOverview, getEnviosSeries, getFaturasStatus, getConversao } from '../services/analytics'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts'

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

export default function Dashboard() {
  const [days, setDays] = useState('30')
  const [janela, setJanela] = useState('7')

  const [cards, setCards] = useState(null)
  const [enviosSeries, setEnviosSeries] = useState([])
  const [faturasStatus, setFaturasStatus] = useState([])
  const [conv, setConv] = useState({ taxa: 0, items: [] })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true); setError('')
        const ate = new Date()
        const desde = new Date()
        desde.setDate(ate.getDate() - Number(days))
        const toISO = (d) => d.toISOString().slice(0,10)
        const params = { desde: toISO(desde), ate: toISO(ate) }

        const [ov, ts, fs, cv] = await Promise.all([
          getOverview(params),
          getEnviosSeries(params),
          getFaturasStatus(params),
          getConversao({ ...params, janela_dias: Number(janela) }),
        ])

        if (!alive) return
        setCards(ov.data)
        setEnviosSeries(Array.isArray(ts.data?.items) ? ts.data.items : [])
        setFaturasStatus(Array.isArray(fs.data?.items) ? fs.data.items : [])
        setConv(cv.data || { taxa: 0, items: [] })
      } catch (err) {
        if (alive) setError(err?.response?.data?.detail || 'Falha ao carregar dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [days, janela])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Dashboard</h1>
        <div className="flex items-center gap-2">
          <PeriodoPicker value={days} onChange={setDays} />
          <JanelaPicker value={janela} onChange={setJanela} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="p-4"><div className="skeleton h-16 w-full" /></Card>)}
        </div>
      ) : error ? (
        <Card className="p-4 text-red-600">{error}</Card>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-500">Clientes</div>
              <div className="text-2xl font-semibold">{cards?.clientes_total ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Faturas abertas</div>
              <div className="text-2xl font-semibold">{cards?.faturas_abertas ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Lembretes ativos</div>
              <div className="text-2xl font-semibold">{cards?.lembretes_ativos ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Envios no período</div>
              <div className="text-2xl font-semibold">{cards?.envios_periodo ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Entregues no período</div>
              <div className="text-2xl font-semibold">{cards?.entregues_periodo ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Taxa de sucesso</div>
              <div className="text-2xl font-semibold">{`${Math.round((cards?.taxa_sucesso || 0) * 100)}%`}</div>
            </Card>
            <Card className="p-4 md:col-span-3">
              <div className="text-sm text-slate-500">Valor pago no período</div>
              <div className="text-2xl font-semibold">{`R$ ${Number(cards?.valor_pago_periodo || 0).toFixed(2)}`}</div>
            </Card>
          </div>

          {/* Gráfico 1: Envios por dia por canal */}
          <Card className="p-4">
            <div className="mb-2 font-semibold">Envios por dia por canal</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enviosSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="whatsapp" />
                  <Line type="monotone" dataKey="email" />
                  <Line type="monotone" dataKey="sms" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico 2: Faturas por status (mensal) */}
          <Card className="p-4">
            <div className="mb-2 font-semibold">Faturas por status (mensal)</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturasStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pendente" stackId="a" />
                  <Bar dataKey="pago" stackId="a" />
                  <Bar dataKey="atrasado" stackId="a" />
                  <Bar dataKey="cancelado" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico 3: Conversão (envios x pagamentos em até N dias) */}
          <Card className="p-4">
            <div className="mb-2 font-semibold">
              Conversão de envios em pagamentos (janela {conv?.janela_dias || janela}d) — taxa {Math.round((conv?.taxa || 0)*100)}%
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conv?.items || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="envios" />
                  <Line type="monotone" dataKey="pagos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
