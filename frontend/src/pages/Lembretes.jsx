// src/pages/Lembretes.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Eye, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { listLembretes, deleteLembrete, previewLembrete } from '../services/lembretes'
import { getClientes } from '../services/clientes'

export default function Lembretes() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [clientesMap, setClientesMap] = useState({})
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchAll() {
      setLoading(true)
      setError('')
      try {
        const [lemb, cls] = await Promise.allSettled([listLembretes(), getClientes()])
        if (mounted) {
          if (lemb.status === 'fulfilled') setItems(Array.isArray(lemb.value) ? lemb.value : [])
          else setError(lemb.reason?.response?.data?.detail || 'Falha ao carregar lembretes')

          if (cls.status === 'fulfilled') {
            const arr = Array.isArray(cls.value?.data) ? cls.value.data : []
            setClientes(arr)
            const map = {}
            for (const c of arr) map[c.id] = c.nome
            setClientesMap(map)
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchAll()
    return () => { mounted = false }
  }, [])

  // helpers de exibição
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

  const toStr = (v) => (v ?? '').toString()
  const normalize = (v) =>
    toStr(v)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const qNorm = normalize(busca)

  // agrupa por titulo+cliente+tipo e consolida canais + próxima execução (menor data)
  const agrupadas = useMemo(() => {
    const map = {}
    for (const l of items) {
      const clienteNome = getClienteNome(l)
      const tipo = l.rrule ? 'periodico' : 'fatura'
      const key = `${l.titulo}|${l?.cliente_id || clienteNome}|${tipo}`

      const prox = getProximaExec(l)

      if (!map[key]) {
        map[key] = {
          ...l,
          cliente_nome_resolved: clienteNome,
          canais: new Set([l.canal]),
          lembreteIds: [l.id],
          proxima_execucao_at: prox,
        }
      } else {
        map[key].canais.add(l.canal)
        map[key].lembreteIds.push(l.id)
        if (prox && (!map[key].proxima_execucao_at || new Date(prox) < new Date(map[key].proxima_execucao_at))) {
          map[key].proxima_execucao_at = prox
        }
      }
    }

    let arr = Object.values(map)
    if (qNorm) {
      arr = arr.filter((l) => {
        const titulo = normalize(l?.titulo)
        const cliente = normalize(l?.cliente_nome_resolved)
        return titulo.includes(qNorm) || cliente.includes(qNorm)
      })
    }
    return arr
  }, [items, qNorm, clientesMap])

  const fmtDateTime = (iso) => {
    if (!iso) return '-'
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  const handleNovo = () => navigate('/lembretes/novo')
  const handleEditar = (id) => navigate(`/lembretes/editar/${id}`)
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

  function TipoBadge({ isPeriodico }) {
    const label = isPeriodico ? 'Periódico' : 'Fatura'
    const cls = isPeriodico ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
  }

  function CanalBadge({ canal }) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
        {canal}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Lembretes</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Novo Lembrete</Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por título ou cliente"
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
                <th className="md:w-[15%] py-2 px-3 font-semibold">Título</th>
                <th className="md:w-[18%] py-2 px-3 font-semibold">Cliente</th>
                <th className="md:w-[10%] py-2 px-3 font-semibold">Tipo</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Canais</th>
                <th className="md:w-[15%] py-2 px-3 font-semibold">Próxima Execução</th>
                <th className="md:w-[46%] py-2 px-3 font-semibold w-[220px]">Ações</th>
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

              {!loading && !error && agrupadas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">Nenhum lembrete encontrado.</td>
                </tr>
              )}

              {!loading && !error && agrupadas.map((l) => (
                <tr key={l.titulo + '|' + l?.cliente_id + '|' + (l.rrule ? 'p' : 'f')} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-3">{l.titulo}</td>
                  <td className="py-2 px-3">{l.cliente_nome_resolved}</td>
                  <td className="py-2 px-3">
                    <TipoBadge isPeriodico={!!l.rrule} />
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
                        <Eye size={14}/> Vizualizar
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
