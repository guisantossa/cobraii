// src/pages/admin/AdminUsuarios.jsx
import { useEffect, useMemo, useState } from 'react'
import { Users, BellRing, Send, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Download, RefreshCw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import AdminGuard from '../../components/admin/AdminGuard'
import { getAdminUsuarios, getAdminUsuariosMetrics } from '../../services/admin'

const PAGE_SIZE_DEFAULT = 20

function Stat({ icon, title, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
          <div className="text-xl font-semibold leading-tight">{value}</div>
          {sub && <div className="text-xs text-slate-500">{sub}</div>}
        </div>
      </div>
    </Card>
  )
}

function Chip({ ok, children }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${
      ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
         : 'bg-slate-50 text-slate-500 border-slate-200 line-through'
    }`}>{children}</span>
  )
}

function ProgressMini({ used, limit }) {
  if (limit == null) return <span className="text-xs text-slate-600">Ilimitado</span>
  const u = typeof used === 'number' ? used : 0
  const pct = Math.max(0, Math.min(100, Math.round((u / Math.max(1, limit)) * 100)))
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600">{u}/{limit}</span>
      <div className="h-2 w-24 rounded bg-slate-100 overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function downloadCSV(items) {
  const headers = [
    'id','nome','email','documento','telefone','plano','limites','usa_email','usa_sms','usa_zap',
    'lembretes_ativos','lembretes_total','clientes_total','envios_30d','created_at','last_login'
  ]
  const rows = (items || []).map(it => ([
    it.id,
    it.nome || '',
    it.email || '',
    it.documento || '',
    it.telefone || '',
    (it.plano?.nome || it.plano_nome || ''),
    (it.limites ?? ''),
    it.usa_email ? '1' : '0',
    it.usa_sms ? '1' : '0',
    it.usa_zap ? '1' : '0',
    (it.lembretes_ativos ?? ''),
    (it.lembretes_total ?? ''),
    (it.clientes_total ?? ''),
    (it.envios_30d ?? ''),
    (it.created_at || ''),
    (it.last_login || ''),
  ]))
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `admin_usuarios_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Content() {
  // filtros
  const [q, setQ] = useState('')
  const [plano, setPlano] = useState('')   // id ou nome
  const [canal, setCanal] = useState('')   // 'email'|'sms'|'zap'

  // dados
  const [items, setItems] = useState([])
  const [planos, setPlanos] = useState([])
  const [total, setTotal] = useState(0)

  // métricas topo
  const [mTotalUsuarios, setMTotalUsuarios] = useState(0)
  const [mLembretesAtivos, setMLembretesAtivos] = useState(0)
  const [mEnvios30d, setMEnvios30d] = useState(0)
  const [mPorPlano, setMPorPlano] = useState([])

  // ui
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(p = 1) {
    setLoading(true); setError('')
    try {
      const list = await getAdminUsuarios({
        page: p,
        page_size: pageSize,
        q: q?.trim() || undefined,
        plano: plano || undefined,
        canal: canal || undefined,
      })
      const arr = Array.isArray(list?.items) ? list.items : []
      setItems(arr)
      setTotal(typeof list?.total === 'number' ? list.total : arr.length)
      setPage(typeof list?.page === 'number' ? list.page : p)
      if (Array.isArray(list?.planos)) setPlanos(list.planos)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Falha ao carregar usuários')
      setItems([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  async function loadMetrics() {
    try {
      const m = await getAdminUsuariosMetrics().catch(() => ({}))
      setMTotalUsuarios(m?.total_usuarios ?? 0)
      setMLembretesAtivos(m?.lembretes_ativos_total ?? 0)
      setMEnvios30d(m?.envios_30d_total ?? 0)
      setMPorPlano(Array.isArray(m?.por_plano) ? m.por_plano : [])
    } catch {
      // silencioso
    }
  }

  useEffect(() => { load(1); loadMetrics() }, []) // init

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const goFirst = () => load(1)
  const goPrev = () => load(Math.max(1, page - 1))
  const goNext = () => load(Math.min(totalPages, page + 1))
  const goLast = () => load(totalPages)

  function applyFilters() { load(1) }
  function resetFilters() { setQ(''); setPlano(''); setCanal(''); setTimeout(() => load(1), 0) }

  const planoOptions = useMemo(() => {
    // tolera resposta só com nomes
    const base = Array.isArray(planos) ? planos : []
    const names = base.map(p => ({ value: p.id || p.nome, label: p.nome }))
    // fallback estático caso backend ainda não forneça planos
    const fallback = [
      { value: 'free', label: 'Free' },
      { value: 'start', label: 'Start' },
      { value: 'pro', label: 'Pro' },
    ]
    return names.length ? names : fallback
  }, [planos])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="h1">Usuários</h1>
        <p className="text-slate-600">Visão geral dos usuários cadastrados e seus indicadores principais.</p>
      </div>

      {/* Métricas topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Stat icon={<Users size={18} className="text-slate-700" />} title="Usuários" value={mTotalUsuarios} sub={mPorPlano?.length ? mPorPlano.map(p => `${p.plano}: ${p.count}`).join(' · ') : ''} />
        <Stat icon={<BellRing size={18} className="text-slate-700" />} title="Lembretes ativos" value={mLembretesAtivos} />
        <Stat icon={<Send size={18} className="text-slate-700" />} title="Envios (30 dias)" value={mEnvios30d} />
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label>Buscar</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, e-mail, doc..." />
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={plano} onChange={(e) => setPlano(e.target.value)}>
              <option value="">Todos</option>
              {planoOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select value={canal} onChange={(e) => setCanal(e.target.value)}>
              <option value="">Todos</option>
              <option value="zap">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="sms">SMS</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={applyFilters} className="w-full"><RefreshCw size={16}/> Atualizar</Button>
            <Button variant="ghost" onClick={resetFilters}>Limpar</Button>
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4 font-semibold">Usuário</th>
                <th className="py-2 px-4 font-semibold">Plano</th>
                <th className="py-2 px-4 font-semibold">Canais</th>
                <th className="py-2 px-4 font-semibold">Lembretes</th>
                <th className="py-2 px-4 font-semibold">Clientes</th>
                <th className="py-2 px-4 font-semibold">Envios (30d)</th>
                <th className="py-2 px-4 font-semibold">Criado</th>
                <th className="py-2 px-4 font-semibold">Último login</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="p-6"><div className="skeleton h-8 w-full" /></td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} className="p-6 text-red-600">{error}</td></tr>
              )}
              {!loading && !error && items.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-slate-500">Nenhum usuário encontrado.</td></tr>
              )}
              {!loading && !error && items.map((u) => {
                const planoNome = u?.plano?.nome || u?.plano_nome || '—'
                return (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 px-4">
                      <div className="font-medium">{u.nome || '—'}</div>
                      <div className="text-xs text-slate-600">{u.email || '—'}</div>
                      <div className="text-xs text-slate-400">{u.documento || ''}</div>
                    </td>
                    <td className="py-2 px-4">{planoNome}</td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1 flex-wrap">
                        <Chip ok={!!u.usa_zap}>WhatsApp</Chip>
                        <Chip ok={!!u.usa_email}>E-mail</Chip>
                        <Chip ok={!!u.usa_sms}>SMS</Chip>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <ProgressMini used={u.lembretes_ativos} limit={u.limites} />
                        <span className="text-xs text-slate-500">({u.lembretes_total ?? u.lembretes_ativos ?? 0} total)</span>
                      </div>
                    </td>
                    <td className="py-2 px-4">{u.clientes_total ?? '—'}</td>
                    <td className="py-2 px-4">{u.envios_30d ?? '—'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação + Export */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Página <strong>{page}</strong> / {Math.max(1, Math.ceil(total / pageSize))} · Total: <strong>{total}</strong>
              </span>
              <Button variant="ghost" className="h-8" onClick={() => downloadCSV(items)}>
                <Download size={16}/> Exportar CSV (página)
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <button className="c-btn c-btn--ghost" onClick={goFirst} disabled={page === 1} title="Primeira"><ChevronsLeft size={16} /></button>
              <button className="c-btn c-btn--ghost" onClick={goPrev} disabled={page === 1} title="Anterior"><ChevronLeft size={16} /></button>
              <button className="c-btn c-btn--ghost" onClick={goNext} disabled={page >= totalPages} title="Próxima"><ChevronRight size={16} /></button>
              <button className="c-btn c-btn--ghost" onClick={goLast} disabled={page >= totalPages} title="Última"><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function AdminUsuariosPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  )
}
