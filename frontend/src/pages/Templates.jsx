// src/pages/Templates.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { getTemplates, deleteTemplate } from '../services/templates'

const CANAIS = [
  { value: '', label: 'Todos os canais' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'sms', label: 'SMS' },
  { value: 'todos', label: 'Genérico' },
]

export default function Templates() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [busca, setBusca] = useState('')
  const [canal, setCanal] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchData({ keepPage = false } = {}) {
    setLoading(true)
    setError('')
    try {
      const { data } = await getTemplates({
        page: keepPage ? page : 1,
        page_size: pageSize,
        canal: canal || null,
        search: busca || '',
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      if (!keepPage) setPage(Number(data?.page || 1))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize])

  // Recarrega sempre que filtros mudarem
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 300) // debounce leve na busca
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, canal])

  // Paginação
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const canPrev = page > 1
  const canNext = page < totalPages

  async function goPrev() {
    if (!canPrev) return
    setPage((p) => p - 1)
    await fetchData({ keepPage: true })
  }
  async function goNext() {
    if (!canNext) return
    setPage((p) => p + 1)
    await fetchData({ keepPage: true })
  }

  const handleNovo = () => navigate('/templates/novo')
  const handleEditar = (id) => navigate(`/templates/${id}`)

  async function handleExcluir(id) {
    if (!confirm('Confirma excluir este template?')) return
    try {
      await deleteTemplate(id)
      // se a página ficou vazia após excluir, volta uma página
      const rest = (total - 1) - ((page - 1) * pageSize)
      const needBack = page > 1 && rest === 0
      if (needBack) setPage((p) => p - 1)
      await fetchData({ keepPage: !needBack })
    } catch (err) {
      alert(err?.response?.data?.detail || 'Falha ao excluir template')
    }
  }

  function renderPlaceholders(ph) {
    const arr = Array.isArray(ph) ? ph : []
    if (arr.length === 0) return <span className="text-slate-400">—</span>
    const head = arr.slice(0, 3)
    const rest = arr.length - head.length
    return (
      <div className="flex flex-wrap gap-1">
        {head.map((p) => (
          <span key={p} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)' }}>
            {`{{${p}}}`}
          </span>
        ))}
        {rest > 0 && (
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)' }}>
            +{rest}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Templates</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Novo Template</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            placeholder="Buscar por título ou conteúdo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md"
          />

          <Select
            className="c-input max-w-xs"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
          >
            {CANAIS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Itens por página</span>
            <select
              className="c-input"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4 font-semibold">Título</th>
                <th className="py-2 px-4 font-semibold">Canal</th>
                <th className="py-2 px-4 font-semibold">Placeholders</th>
                <th className="py-2 px-4 font-semibold">Atualizado em</th>
                <th className="py-2 px-4 font-semibold w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-6"><div className="skeleton h-8 w-full" /></td></tr>
              )}

              {!loading && error && (
                <tr><td colSpan={5} className="p-6 text-red-600">{error}</td></tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-slate-500">Nenhum template encontrado.</td></tr>
              )}

              {!loading && !error && items.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-4">{t.titulo}</td>
                  <td className="py-2 px-4">{t.canal || <span className="text-slate-400">—</span>}</td>
                  <td className="py-2 px-4">{renderPlaceholders(t.placeholders)}</td>
                  <td className="py-2 px-4">
                    {t.atualizado_em ? new Date(t.atualizado_em).toLocaleString() : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <button className="c-btn c-btn--ghost" onClick={() => handleEditar(t.id)}>
                        <Pencil size={14}/> Editar
                      </button>
                      <button className="c-btn c-btn--ghost text-red-600" onClick={() => handleExcluir(t.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {!loading && !error && totalPages > 1 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Página {page} de {totalPages} — {total} registro(s)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" disabled={!canPrev} onClick={goPrev}>Anterior</Button>
                        <Button variant="ghost" disabled={!canNext} onClick={goNext}>Próxima</Button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  )
}
