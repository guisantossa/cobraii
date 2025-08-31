// src/pages/admin/AdminFeedbacks.jsx
import { useEffect, useMemo, useState } from 'react'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RefreshCw, Download } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { getAdminFeedbacks } from '../../services/admin'
import AdminGuard from '../../components/admin/AdminGuard'

const PAGE_SIZE_DEFAULT = 20

function toISODateStart(d) {
  if (!d) return ''
  return `${d}T00:00:00`
}
function toISODateEnd(d) {
  if (!d) return ''
  return `${d}T23:59:59`
}

function downloadCSV(items) {
  const headers = ['id','criado_em','tipo','origem','rating','comentario','usuario_nome','usuario_email']
  const rows = items.map(it => ([
    it.id,
    it.criado_em,
    it.tipo || '',
    it.origem || '',
    it.rating ?? '',
    (it.comentario || '').replace(/\n/g, ' ').replace(/"/g, '""'),
    it.usuario?.nome || '',
    it.usuario?.email || '',
  ]))
  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `feedbacks_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Content() {
  // filtros
  const [q, setQ] = useState('')
  const [origem, setOrigem] = useState('')
  const [tipo, setTipo] = useState('')
  const [dtIni, setDtIni] = useState('')
  const [dtFim, setDtFim] = useState('')

  // dados
  const [tipos, setTipos] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)

  // ui
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(p = 1) {
    setLoading(true); setError('')
    try {
      const data = await getAdminFeedbacks({
        page: p,
        page_size: pageSize,
        tipo: tipo || undefined,
        origem: origem?.trim() || undefined,
        q: q?.trim() || undefined,
        dt_ini: dtIni ? toISODateStart(dtIni) : undefined,
        dt_fim: dtFim ? toISODateEnd(dtFim) : undefined,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
      if (Array.isArray(data?.tipos)) setTipos(data.tipos)
      setPage(typeof data?.page === 'number' ? data.page : p)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Falha ao carregar feedbacks')
      setItems([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, []) // init

  function applyFilters() { load(1) }
  function resetFilters() {
    setQ(''); setOrigem(''); setTipo(''); setDtIni(''); setDtFim('')
    setTimeout(() => load(1), 0)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const goFirst = () => load(1)
  const goPrev = () => load(Math.max(1, page - 1))
  const goNext = () => load(Math.min(totalPages, page + 1))
  const goLast = () => load(totalPages)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-3">
        <h1 className="h1">Feedbacks</h1>
        <p className="text-slate-600">Acompanhe sugestões, bugs e motivos de upgrade.</p>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label>Busca</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Comentário ou origem..." />
          </div>
          <div>
            <Label>Origem</Label>
            <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="ex.: upgrade_cta" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={applyFilters} className="w-full"><RefreshCw size={16}/> Atualizar</Button>
            <Button variant="ghost" onClick={resetFilters}>Limpar</Button>
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={dtIni} onChange={(e) => setDtIni(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={dtFim} onChange={(e) => setDtFim(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <Button onClick={() => downloadCSV(items)} className="h-10">
              <Download size={16}/> Exportar CSV (página)
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4 font-semibold">Data</th>
                <th className="py-2 px-4 font-semibold">Tipo</th>
                <th className="py-2 px-4 font-semibold">Origem</th>
                <th className="py-2 px-4 font-semibold">Comentário</th>
                <th className="py-2 px-4 font-semibold">Rating</th>
                <th className="py-2 px-4 font-semibold">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="p-6"><div className="skeleton h-8 w-full" /></td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={6} className="p-6 text-red-600">{error}</td></tr>
              )}
              {!loading && !error && items.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-slate-500">Nenhum feedback encontrado.</td></tr>
              )}
              {!loading && !error && items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {new Date(it.criado_em).toLocaleString()}
                  </td>
                  <td className="py-2 px-4">{it.tipo || '—'}</td>
                  <td className="py-2 px-4">{it.origem || '—'}</td>
                  <td className="py-2 px-4 max-w-[420px]">
                    <span title={it.comentario || ''} className="line-clamp-2">{it.comentario || '—'}</span>
                  </td>
                  <td className="py-2 px-4">{it.rating ?? '—'}</td>
                  <td className="py-2 px-4">
                    {it.usuario?.nome || '—'}
                    <div className="text-xs text-slate-500">{it.usuario?.email || ''}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs text-slate-600">
              Página <strong>{page}</strong> / {Math.max(1, Math.ceil(total / pageSize))} — Total: <strong>{total}</strong>
            </span>
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

export default function AdminFeedbacksPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  )
}
