import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { getAuditLogs } from '../services/logs'

const ENTIDADES = [
  { value: '', label: 'Todas' },
  { value: 'cliente', label: 'cliente' },
  { value: 'fatura', label: 'fatura' },
  { value: 'cobranca', label: 'cobranca' },
  { value: 'lembrete', label: 'lembrete' },
  { value: 'template', label: 'template' },
]

const ACOES = [
  { value: '', label: 'Todas' },
  { value: 'create', label: 'create' },
  { value: 'update', label: 'update' },
  { value: 'delete', label: 'delete' },
  { value: 'inactivate', label: 'inactivate' },
  { value: 'schedule', label: 'schedule' },
  { value: 'send', label: 'send' },
  { value: 'status_update', label: 'status_update' },
  { value: 'payment_received', label: 'payment_received' },
]

function formatDateTime(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

function JSONViewer({ data }) {
  const [open, setOpen] = useState(false)
  const json = useMemo(() => {
    try { return JSON.stringify(data ?? null, null, 2) } catch { return String(data) }
  }, [data])

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
    } catch {}
  }

  return (
    <div className="text-xs">
      <div className="flex items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => setOpen(v => !v)}>
          {open ? 'Ocultar' : 'Ver'}
        </Button>
        <Button variant="ghost" type="button" onClick={copy}>Copiar</Button>
      </div>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl border p-2 bg-slate-50 text-slate-800"
             style={{ borderColor: 'var(--border)' }}>
{json}
        </pre>
      )}
    </div>
  )
}

export default function Logs() {
  // filtros
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [entidadeId, setEntidadeId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [includeSystem, setIncludeSystem] = useState(true)
  const [scope, setScope] = useState('actor') // 'actor' | 'all'

  // período default: últimos 7 dias
  const today = useMemo(() => new Date(), [])
  const d0 = useMemo(() => {
    const x = new Date()
    x.setDate(x.getDate() - 7)
    return x
  }, [])
  const [desde, setDesde] = useState(d0.toISOString().slice(0, 10))
  const [ate, setAte] = useState(today.toISOString().slice(0, 10))

  // dados
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchData() {
    setLoading(true); setError('')
    try {
      const params = {
        entidade_tipo: entidade || undefined,
        acao: acao || undefined,
        entidade_id: entidadeId || undefined,
        usuario_id: usuarioId || undefined,
        desde: desde || undefined,
        ate: ate || undefined,
        include_system: includeSystem,
        scope,
        page,
        page_size: pageSize,
      }
      const { data } = await getAuditLogs(params)
      setRows(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  // refetch ao mudar filtros/paginação
  useEffect(() => { fetchData() /* eslint-disable-next-line */ }, [entidade, acao, entidadeId, usuarioId, includeSystem, scope, desde, ate, page, pageSize])

  function resetar() {
    setEntidade('')
    setAcao('')
    setEntidadeId('')
    setUsuarioId('')
    setIncludeSystem(true)
    setScope('actor')
    // mantém período; zera paginação
    setPage(1)
  }

  // paginação
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Logs de Auditoria</h1>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Entidade</div>
            <Select value={entidade} onChange={(e) => { setEntidade(e.target.value); setPage(1) }}>
              {ENTIDADES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Ação</div>
            <Select value={acao} onChange={(e) => { setAcao(e.target.value); setPage(1) }}>
              {ACOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Entidade ID</div>
            <Input value={entidadeId} onChange={(e) => { setEntidadeId(e.target.value.trim()); setPage(1) }} placeholder="UUID (opcional)" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Usuário ID</div>
            <Input value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value.trim()); setPage(1) }} placeholder="UUID (opcional)" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Desde</div>
            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1) }} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Até</div>
            <Input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPage(1) }} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Escopo</div>
            <Select value={scope} onChange={(e) => { setScope(e.target.value); setPage(1) }}>
              <option value="actor">Meus + sistema</option>
              <option value="all">Todos (admin)</option>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeSystem} onChange={(e) => { setIncludeSystem(e.target.checked); setPage(1) }} />
              Incluir system
            </label>
            <Button variant="ghost" type="button" onClick={resetar}>Limpar</Button>
            <Button type="button" onClick={() => { setPage(1); fetchData() }}>Atualizar</Button>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4 font-semibold w-[190px]">Data</th>
                <th className="py-2 px-4 font-semibold">Ação</th>
                <th className="py-2 px-4 font-semibold">Entidade</th>
                <th className="py-2 px-4 font-semibold">Usuário</th>
                <th className="py-2 px-4 font-semibold">IP</th>
                <th className="py-2 px-4 font-semibold w-[220px]">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6">
                    <div className="skeleton h-8 w-full" />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="p-6 text-red-600">{error}</td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">Nenhum log encontrado.</td>
                </tr>
              )}

              {!loading && !error && rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-4 whitespace-nowrap">{formatDateTime(r.criado_em)}</td>
                  <td className="py-2 px-4">{r.acao}</td>
                  <td className="py-2 px-4">
                    <div className="text-xs text-slate-600">{r.entidade_tipo || '-'}</div>
                    <div className="text-[11px] text-slate-400">{r.entidade_id || '-'}</div>
                  </td>
                  <td className="py-2 px-4">
                    <div className="text-xs">{r.usuario_id || <span className="text-slate-400">system</span>}</div>
                  </td>
                    <td className="py-2 px-4">{r.ip || '-'}</td>
                  <td className="py-2 px-4">
                    <JSONViewer data={r.detalhes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* paginação */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs text-slate-500">
            Página {page} de {Math.max(1, totalPages)} — {total} itens
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
            </Select>
            <Button variant="ghost" disabled={!canPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
            <Button disabled={!canNext} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
