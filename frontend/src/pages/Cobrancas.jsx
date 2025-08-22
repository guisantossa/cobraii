// src/pages/Cobrancas.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pencil, Plus, Eye, Bell, CheckCircle2,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X
} from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { getCobrancas } from '../services/cobrancas'
import api from '../services/api'

const PAGE_SIZE_DEFAULT = 20

export default function Cobrancas() {
  const navigate = useNavigate()

  // dados
  const [cobrancas, setCobrancas] = useState([])

  // estado UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // filtros/busca
  const [buscaCliente, setBuscaCliente] = useState('')
  const [filtroTitulo, setFiltroTitulo] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')

  // paginação
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE_DEFAULT)

  // modal: confirmar pagamento
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [dataPagamento, setDataPagamento] = useState(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  // === carregar lista ===
  const reload = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getCobrancas()
      setCobrancas(Array.isArray(data) ? data : (data?.items ?? []))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao carregar cobranças')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await reload()
    })()
    return () => { mounted = false }
  }, [])

  // helpers
  const toStr = (v) => (v ?? '').toString()
  const normalize = (v) =>
    toStr(v).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

  const parseNumber = (v) => {
    if (v === '' || v === null || v === undefined) return null
    const num = Number(
      toStr(v).replace(/\./g, '').replace(',', '.').trim()
    )
    return Number.isFinite(num) ? num : null
  }

  const fmtBRL = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0))

  const fmtData = (iso) => {
    if (!iso) return '-'
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  // normalizações
  const qCliente = normalize(buscaCliente)
  const qTitulo  = normalize(filtroTitulo)
  const vMin = parseNumber(valorMin)
  const vMax = parseNumber(valorMax)

  // filtrar client-side
  const filtradas = useMemo(() => {
    return cobrancas.filter((c) => {
      const clienteNome = normalize(c?.cliente?.nome || c?.cliente_nome_avulso)
      if (qCliente && !clienteNome.includes(qCliente)) return false

      const titulo = normalize(c?.titulo)
      if (qTitulo && !titulo.includes(qTitulo)) return false

      const valor = Number(c?.valor ?? 0)
      if (vMin !== null && !(valor >= vMin)) return false
      if (vMax !== null && !(valor <= vMax)) return false

      const venc = toStr(c?.vencimento)
      if (dataIni && (!venc || venc < dataIni)) return false
      if (dataFim && (!venc || venc > dataFim)) return false

      return true
    })
  }, [cobrancas, qCliente, qTitulo, vMin, vMax, dataIni, dataFim])

  // reset de página ao mudar filtros
  useEffect(() => { setPage(1) }, [qCliente, qTitulo, vMin, vMax, dataIni, dataFim])

  // paginação
  const total = filtradas.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, total)
  const pageItems = filtradas.slice(startIndex, endIndex)

  // navegação/ações
  const handleNovo = () => navigate('/cobrancas/novo')
  const handleEditar = (id) => navigate(`/cobrancas/editar/${id}`)
  const handleVisualizar = (id) => navigate(`/cobrancas/${id}`)
  const handleCriarLembrete = (id) => navigate(`/lembretes/offsets/${encodeURIComponent(id)}`)

  // util: obter fatura_id com fallback
  const resolveFaturaId = (c) => c?.fatura_id ?? c?.id

  // abrir modal
  const openModal = (item) => {
    setSelectedItem(item)
    setModalError('')
    // default = hoje; se quiser pré-carregar a data de pagamento existente:
    // if (item?.data_pagamento) setDataPagamento(item.data_pagamento)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedItem(null)
    setModalError('')
  }

  // confirmar pagamento
  const confirmarPagamento = async () => {
    if (!selectedItem) return
    const faturaId = resolveFaturaId(selectedItem)
    if (!faturaId) {
      setModalError('ID da fatura inválido.')
      return
    }
    if (!dataPagamento) {
      setModalError('Informe a data de pagamento.')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      // PATCH /faturas/{fatura_id}/marcar-paga?data_pagamento=YYYY-MM-DD
      // (se o backend espera no body, troque para { data_pagamento } no segundo parâmetro)
      await api.patch(`/faturas/${encodeURIComponent(faturaId)}/marcar-paga`, null, {
        params: { data_pagamento: dataPagamento },
      })
      await reload()
      closeModal()
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Falha ao confirmar pagamento'
      setModalError(msg)
    } finally {
      setModalLoading(false)
    }
  }

  // paginação controls
  const goFirst = () => setPage(1)
  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))
  const goLast = () => setPage(totalPages)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Cobranças</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Nova Cobrança</Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <Input
            placeholder="Buscar por nome do cliente"
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            className="md:col-span-4"
          />
          <Input
            placeholder="Filtrar por título"
            value={filtroTitulo}
            onChange={(e) => setFiltroTitulo(e.target.value)}
            className="md:col-span-2"
          />
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <Input
              placeholder="Valor mín (ex: 1000,00)"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              title="Valor mínimo"
            />
            <Input
              placeholder="Valor máx (ex: 5000,00)"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              title="Valor máximo"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Input
              type="date"
              value={dataIni}
              onChange={(e) => setDataIni(e.target.value)}
              title="Vencimento a partir de"
            />
            <span className="text-slate-500 text-sm shrink-0">até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              title="Vencimento até"
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="md:w-[20%] py-2 px-3 font-semibold">Título</th>
                <th className="md:w-[20%] py-2 px-3 font-semibold">Cliente</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Valor</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Vencimento</th>
                <th className="md:w-[28%] py-2 px-3 font-semibold w-[240px]">Ações</th>
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
                  <td colSpan={5} className="p-6 text-slate-500">Nenhuma cobrança encontrada.</td>
                </tr>
              )}

              {!loading && !error && pageItems.map((c) => {
                const hasActive = !!(c?.tem_lembrete_ativo ?? c?.temLembreteAtivo)
                const isPago = (c?.status === 'pago') // se existir
                return (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 px-3">{c.titulo}</td>
                    <td className="py-2 px-3">{c?.cliente?.nome || c?.cliente_nome_avulso || '-'}</td>
                    <td className="py-2 px-3">{fmtBRL(c.valor)}</td>
                    <td className="py-2 px-3">{fmtData(c.vencimento)}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        <button className="c-btn c-btn--ghost" onClick={() => handleVisualizar(c.id)}>
                          <Eye size={14}/> Ver
                        </button>
                        <button className="c-btn c-btn--ghost" onClick={() => handleEditar(c.id)}>
                          <Pencil size={14}/> Editar
                        </button>

                        <button
                          onClick={() => handleCriarLembrete(c.id)}
                          disabled={hasActive}
                          title={hasActive ? 'Já possui lembrete ativo' : 'Criar Lembrete'}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            hasActive
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'c-btn c-btn--ghost hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Bell size={14}/> Criar Lembrete
                        </button>

                        <button
                          onClick={() => openModal(c)}
                          disabled={isPago}
                          title={isPago ? 'Fatura já está paga' : 'Confirmar Pagamento'}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            isPago
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'c-btn c-btn--ghost hover:bg-green-50 text-green-700'
                          }`}
                        >
                          <CheckCircle2 size={14}/> Confirmar Pagamento
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
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

      {/* Modal Confirmar Pagamento */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeModal}
          />
          {/* content */}
          <div className="relative z-10 w-full max-w-md">
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">Confirmar Pagamento</h2>
                <button className="c-btn c-btn--ghost" onClick={closeModal} title="Fechar">
                  <X size={18}/>
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-sm text-slate-600">
                  {selectedItem?.titulo ? (
                    <>Cobrança: <strong>{selectedItem.titulo}</strong></>
                  ) : null}
                </div>
                <label className="text-sm text-slate-700">Data do pagamento</label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
                {modalError && (
                  <div className="text-sm text-red-600">{modalError}</div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="c-btn c-btn--ghost" onClick={closeModal}>Cancelar</button>
                <Button onClick={confirmarPagamento} disabled={modalLoading}>
                  {modalLoading ? 'Confirmando...' : <><CheckCircle2 size={16}/> Confirmar</>}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
