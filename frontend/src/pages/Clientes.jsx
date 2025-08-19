import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { getClientes } from '../services/clientes'

const PAGE_SIZE_DEFAULT = 20

export default function Clientes() {
  const navigate = useNavigate()

  // dados
  const [clientes, setClientes] = useState([])
  // UI state
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // paginação (client-side)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE_DEFAULT)

  // carregar lista (modelo atual: endpoint retorna tudo)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await getClientes()
        if (!mounted) return
        setClientes(Array.isArray(data) ? data : (data?.items ?? [])) // tolera {items: [...]}
      } catch (err) {
        if (!mounted) return
        setError(err?.response?.data?.detail || 'Falha ao carregar clientes')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // helpers de normalização
  const toStr = (v) => (v ?? '').toString()
  const normalize = (v) =>
    toStr(v)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const onlyDigits = (v) => toStr(v).replace(/\D/g, '')

  // busca normalizada
  const qNorm = normalize(busca)
  const qDigits = onlyDigits(busca)

  // filtrar
  const filtrados = useMemo(() => {
    if (!qNorm && !qDigits) return clientes
    return clientes.filter((c) => {
      const nome = normalize(c?.nome)
      const email = normalize(c?.email)
      const tel = onlyDigits(c?.telefone)
      const doc = onlyDigits(c?.documento)
      return (
        (qNorm && (nome.includes(qNorm) || email.includes(qNorm))) ||
        (qDigits && (tel.includes(qDigits) || doc.includes(qDigits)))
      )
    })
  }, [clientes, qNorm, qDigits])

  // resetar para página 1 quando buscar
  useEffect(() => {
    setPage(1)
  }, [qNorm, qDigits])

  // paginação client-side
  const total = filtrados.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, total)
  const pageItems = filtrados.slice(startIndex, endIndex)

  // ações
  const handleNovo = () => navigate('/clientes/novo')
  const handleEditar = (id) => navigate(`/clientes/${id}`)

  const goFirst = () => setPage(1)
  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))
  const goLast = () => setPage(totalPages)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Clientes</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Novo Cliente</Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou documento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md"
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4 font-semibold">Nome</th>
                <th className="py-2 px-4 font-semibold">E-mail</th>
                <th className="py-2 px-4 font-semibold">Telefone</th>
                <th className="py-2 px-4 font-semibold">Documento</th>
                <th className="py-2 px-4 font-semibold w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6">
                    <div className="skeleton h-8 w-full" />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={5} className="p-6 text-red-600">{error}</td>
                </tr>
              )}

              {!loading && !error && pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">Nenhum cliente encontrado.</td>
                </tr>
              )}

              {!loading && !error && pageItems.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-4">{c.nome}</td>
                  <td className="py-2 px-4">{c.email || '-'}</td>
                  <td className="py-2 px-4">{c.telefone || '-'}</td>
                  <td className="py-2 px-4">{c.documento || '-'}</td>
                  <td className="py-2 px-4">
                    <button className="c-btn c-btn--ghost" onClick={() => handleEditar(c.id)}>
                      <Pencil size={14}/> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barra de paginação */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs text-slate-600">
              Mostrando <strong>{total === 0 ? 0 : startIndex + 1}</strong>–<strong>{endIndex}</strong> de <strong>{total}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button className="c-btn c-btn--ghost" onClick={goFirst} disabled={currentPage === 1} title="Primeira">
                <ChevronsLeft size={16} />
              </button>
              <button className="c-btn c-btn--ghost" onClick={goPrev} disabled={currentPage === 1} title="Anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs text-slate-700">
                Página <strong>{currentPage}</strong> / {totalPages}
              </span>
              <button className="c-btn c-btn--ghost" onClick={goNext} disabled={currentPage === totalPages} title="Próxima">
                <ChevronRight size={16} />
              </button>
              <button className="c-btn c-btn--ghost" onClick={goLast} disabled={currentPage === totalPages} title="Última">
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
