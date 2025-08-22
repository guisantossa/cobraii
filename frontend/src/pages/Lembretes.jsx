// src/pages/Lembretes.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Eye, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { listLembretes, deleteLembrete, previewLembrete } from '../services/lembretes'
import { getClientes } from '../services/clientes'
import { getCobrancas } from '../services/cobrancas'

const PAGE_SIZE_DEFAULT = 20
const CANAIS = ['whatsapp', 'email', 'sms']                      // ajuste se necessário
const STATUS_ENVIO = ['pendente', 'enviado', 'falha']            // ajuste se necessário
const TIPO_OPCOES = ['periodico', 'fatura']
const ATIVO_OPCOES = ['ativo', 'inativo']

export default function Lembretes() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [clientesMap, setClientesMap] = useState({})
  const [cobrancasMap, setCobrancasMap] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // busca + filtros (multi)
  const [busca, setBusca] = useState('') // título/cliente
  const [filters, setFilters] = useState({
    canal: [],
    status_envio: [],
    tipo: [],
    ativo: [], // 'ativo' | 'inativo'
  })

  // período próxima execução
  const [execIni, setExecIni] = useState('')
  const [execFim, setExecFim] = useState('')

  // paginação
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE_DEFAULT)

  // preview modal
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // carregar tudo (tolerando formatos diferentes)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [lemb, cls, cobs] = await Promise.allSettled([listLembretes(), getClientes(), getCobrancas()])

        if (!mounted) return

        // Lembretes
        if (lemb.status === 'fulfilled') {
          const raw = lemb.value
          const data = Array.isArray(raw)
            ? raw
            : (Array.isArray(raw?.data) ? raw.data : (raw?.items ?? []))
          setItems(data)
        } else {
          setError(lemb.reason?.response?.data?.detail || 'Falha ao carregar lembretes')
        }

        // Clientes -> map
        if (cls.status === 'fulfilled') {
          const raw = cls.value
          const arr = Array.isArray(raw?.data) ? raw.data : (raw?.items ?? [])
          const map = {}
          for (const c of arr) map[c.id] = c.nome
          setClientesMap(map)
        }

        // Cobrancas -> map para resolver título de fatura
        if (cobs.status === 'fulfilled') {
          const raw = cobs.value
          const arr = Array.isArray(raw?.data) ? raw.data : (raw?.items ?? [])
          const map = {}
          for (const cb of arr) map[cb.id] = cb.titulo
          setCobrancasMap(map)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // helpers
  const toStr = (v) => (v ?? '').toString()
  const normalize = (v) => toStr(v).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

  const getClienteNome = (l) =>
    l?.cliente?.nome ||
    clientesMap[l?.cliente_id] ||
    l?.cliente_nome_avulso ||
    '-'

  const getProximaExec = (l) =>
    l?.proxima_execucao_at ||
    l?.proxima_execucao ||
    l?.next_execution_at ||
    l?.next_run_at ||
    null

  // Título: se for fatura (sem rrule), preferir título da cobrança (id -> titulo)
  const getTitulo = (l) => {
    if (!l?.rrule) {
      if (l?.cobranca?.titulo) return l.cobranca.titulo
      if (l?.meta?.cobranca_titulo) return l.meta.cobranca_titulo
      const id = l?.cobranca_id || l?.meta?.cobranca_id
      if (id && cobrancasMap[id]) return cobrancasMap[id]
    }
    return l?.titulo || '-'
  }

  const fmtDateTime = (iso) => {
    if (!iso) return '-'
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  // busca normalizada
  const qNorm = normalize(busca)

  // Agrupar (tituloResolvido + cliente + tipo) e agregar estados
  const agrupadas = useMemo(() => {
    const map = {}
    for (const l of items) {
      const clienteNome = getClienteNome(l)
      const isPeriodico = !!l.rrule
      const tipo = isPeriodico ? 'periodico' : 'fatura'
      const tituloResolvido = getTitulo(l)
      const key = `${tituloResolvido}|${l?.cliente_id || clienteNome}|${tipo}`
      const prox = getProximaExec(l)

      if (!map[key]) {
        map[key] = {
          ...l,
          titulo_resolved: tituloResolvido,
          cliente_nome_resolved: clienteNome,
          tipo_resolved: tipo,
          canais: new Set([l.canal].filter(Boolean)),
          status_envio_set: new Set([l.status_envio].filter(Boolean)), // se existir
          lembreteIds: [l.id],
          proxima_execucao_at: prox,
          ativo_group: !!l.ativa,                 // true se algum ativo
          all_inactive_group: !l.ativa,          // true se todos inativos
        }
      } else {
        if (l.canal) map[key].canais.add(l.canal)
        if (l.status_envio) map[key].status_envio_set.add(l.status_envio)
        map[key].lembreteIds.push(l.id)
        if (prox && (!map[key].proxima_execucao_at || new Date(prox) < new Date(map[key].proxima_execucao_at))) {
          map[key].proxima_execucao_at = prox
        }
        map[key].ativo_group = map[key].ativo_group || !!l.ativa
        map[key].all_inactive_group = map[key].all_inactive_group && !l.ativa
      }
    }

    let arr = Object.values(map)

    // busca por título/cliente
    if (qNorm) {
      arr = arr.filter((l) => {
        const t = normalize(l?.titulo_resolved)
        const c = normalize(l?.cliente_nome_resolved)
        return t.includes(qNorm) || c.includes(qNorm)
      })
    }

    // normaliza flags finais
    arr = arr.map((l) => ({
      ...l,
      ativo_resolved: l.ativo_group,
      inativo_resolved: l.all_inactive_group,
    }))

    return arr
  }, [items, qNorm, clientesMap, cobrancasMap])

  // filtros (chips): tipo, canal, status_envio, ativo e janela de data
  const filtradas = useMemo(() => {
    return agrupadas.filter((l) => {
      // tipo (chips)
      if (filters.tipo.length && !filters.tipo.includes(l.tipo_resolved)) return false

      // canais (chips) — requer que o grupo tenha todos os selecionados
      if (filters.canal.length > 0) {
        const set = l.canais || new Set()
        for (const ch of filters.canal) if (!set.has(ch)) return false
      }

      // status_envio (chips) — se não houver status, deixa passar quando nenhum estiver selecionado
      if (filters.status_envio.length > 0) {
        const set = l.status_envio_set || new Set()
        for (const st of filters.status_envio) if (!set.has(st)) return false
      }

      // ativo/inativo (chips) — se marcar ambos, passa
      if (filters.ativo.length === 1) {
        if (filters.ativo[0] === 'ativo' && !l.ativo_resolved) return false
        if (filters.ativo[0] === 'inativo' && !l.inativo_resolved) return false
      }

      // próxima execução entre datas
      const prox = l.proxima_execucao_at ? toStr(l.proxima_execucao_at) : ''
      if (execIni && (!prox || prox < execIni)) return false
      if (execFim && (!prox || prox > execFim)) return false

      return true
    })
  }, [agrupadas, filters, execIni, execFim])

  // reset de página quando filtros mudam
  useEffect(() => {
    setPage(1)
  }, [qNorm, JSON.stringify(filters), execIni, execFim])

  // paginação
  const total = filtradas.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, total)
  const pageItems = filtradas.slice(startIndex, endIndex)

  // === navegação por tipo (offset vs rrule) ===
  const isOffsetBased = (l) => Array.isArray(l?.offsets) && l.offsets.length > 0
  const isRruleBased  = (l) => !!l?.rrule
  const routeEditById = (id) => {
    const found = items.find((x) => x.id === id)
    if (!found) return navigate(`/lembretes/editar/${id}`) // fallback
    if (isOffsetBased(found)) return navigate(`/lembretes/offsets/${id}`) // LembretesOffsetsForm
    if (isRruleBased(found))  return navigate(`/lembretes/editar/${id}`)  // LembretesForm
    return navigate(`/lembretes/editar/${id}`)
  }

  // ações
  const handleNovo = () => navigate('/lembretes/novo')
  const handleEditar = (id) => routeEditById(id)
  const handleView = (id) => navigate(`/lembretes/${id}`)

  async function handlePreview(ids) {
    try {
      setPreviewLoading(true)
      setPreview(null)
      const previews = []
      for (const id of ids) {
        const data = await previewLembrete(id, 8)
        previews.push(...(data?.execucoes || []))
      }
      previews.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      setPreview({ execucoes: previews })
    } catch (err) {
      setPreview({ execucoes: [], error: err?.response?.data?.detail || 'Falha ao gerar preview' })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleExcluir(ids) {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return
    try {
      for (const id of ids) await deleteLembrete(id)
      setItems((prev) => prev.filter((l) => !ids.includes(l.id)))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Falha ao excluir lembrete')
    }
  }

  // UI helpers
  function TipoBadge({ isPeriodico }) {
    const label = isPeriodico ? 'Periódico' : 'Fatura'
    const cls = isPeriodico ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
  }
  function CanalBadge({ canal }) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{canal}</span>
  }

  // paginação controls
  const goFirst = () => setPage(1)
  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))
  const goLast = () => setPage(totalPages)

  // toggle multi (chips)
  const toggleMulti = (key, value) => {
    setFilters((prev) => {
      const curr = prev[key] || []
      const next = curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]
      return { ...prev, [key]: next }
    })
  }

  // util para estilo dos chips
  const chipCls = (active) =>
    `px-3 py-1 rounded-full border ${active ? 'bg-slate-900 text-white' : 'bg-white'}`
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Lembretes</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Novo Lembrete</Button>
      </div>

      {/* Filtros multi-linha */}
      <Card className="p-4 space-y-4">
        {/* Linha 1: Busca + Período */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6">
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar por título ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="md:col-span-6 flex items-end gap-2">
            <div className="flex-1">
              <Label>Próx. execução (de)</Label>
              <Input type="date" value={execIni} onChange={(e) => setExecIni(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Próx. execução (até)</Label>
              <Input type="date" value={execFim} onChange={(e) => setExecFim(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Linha 2: Tipo + Status envio */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-6">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {TIPO_OPCOES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMulti('tipo', s)}
                  className={chipCls(filters.tipo.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-6">
            <Label>Status de envio</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_ENVIO.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMulti('status_envio', s)}
                  className={chipCls(filters.status_envio.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha 3: Canal + Ativo/Inativo */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-6">
            <Label>Canal</Label>
            <div className="flex flex-wrap gap-2">
              {CANAIS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMulti('canal', s)}
                  className={chipCls(filters.canal.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-6">
            <Label>Status (Ativo/Inativo)</Label>
            <div className="flex flex-wrap gap-2">
              {ATIVO_OPCOES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMulti('ativo', s)}
                  className={chipCls(filters.ativo.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="md:w-[15%] py-2 px-3 font-semibold">Título</th>
                <th className="md:w-[18%] py-2 px-3 font-semibold">Cliente</th>
                <th className="md:w-[10%] py-2 px-3 font-semibold">Tipo</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Canais</th>
                <th className="md:w-[11%] py-2 px-3 font-semibold">Próxima Execução</th>
                <th className="md:w-[50%] py-2 px-3 font-semibold w-[220px]">Ações</th>
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

              {!loading && !error && pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">Nenhum lembrete encontrado.</td>
                </tr>
              )}

              {!loading && !error && pageItems.map((l) => (
                <tr
                  key={l.titulo_resolved + '|' + (l?.cliente_id || l.cliente_nome_resolved) + '|' + l.tipo_resolved}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="py-2 px-3">{l.titulo_resolved}</td>
                  <td className="py-2 px-3">{l.cliente_nome_resolved}</td>
                  <td className="py-2 px-3">
                    <TipoBadge isPeriodico={l.tipo_resolved === 'periodico'} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {[...l.canais].map((canal) => (
                        <CanalBadge key={canal} canal={canal} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">{fmtDateTime(l.proxima_execucao_at)}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      <button className="c-btn c-btn--ghost" onClick={() => handleEditar(l.lembreteIds[0])}>
                        <Pencil size={14}/> Editar
                      </button>
                      <button className="c-btn c-btn--ghost" onClick={() => handleView(l.lembreteIds[0])}>
                        <Eye size={14}/> Visualizar
                      </button>
                      <button className="c-btn c-btn--ghost" onClick={() => handlePreview(l.lembreteIds)}>
                        Prévia
                      </button>
                      <button className="c-btn c-btn--ghost" onClick={() => handleExcluir(l.lembreteIds)}>
                        <Trash2 size={14}/> Excluir
                      </button>
                    </div>
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

      {/* Modal Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <Card className="p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="h2">Próximas Execuções</h2>
              <Button variant="ghost" onClick={() => setPreview(null)}>Fechar</Button>
            </div>

            {previewLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-6 w-full" />
                <div className="skeleton h-6 w-5/6" />
                <div className="skeleton h-6 w-2/3" />
              </div>
            ) : preview.error ? (
              <div className="p-3 rounded bg-red-100 text-red-700 border border-red-200">
                {preview.error}
              </div>
            ) : (preview.execucoes?.length ? (
              <ul className="space-y-1 text-sm">
                {preview.execucoes.map((e, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{new Date(e.scheduled_at).toLocaleString()}</span>
                    <span className="text-xs text-slate-500">{e.origem}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500">Nenhuma execução encontrada.</div>
            ))}

            <div className="mt-4 text-right">
              <Button onClick={() => setPreview(null)}>Ok</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
