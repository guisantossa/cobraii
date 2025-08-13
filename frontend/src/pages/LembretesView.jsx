// src/pages/LembretesView.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Label } from '../components/ui/Label'
import api from '../services/api'
import { getLembrete, updateLembrete } from '../services/lembretes'
import { getClientes } from '../services/clientes'

const PAGE_SIZE = 25

const fmtDateTime = (iso) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

async function getOcorrencias(lembreteId, limit = 200) {
  // Ajuste para o seu endpoint real, se necessário
  const { data } = await api.get(`/lembretes/${lembreteId}/ocorrencias`, { params: { limit } })
  return Array.isArray(data) ? data : []
}

async function getGrupoByEndpoint(lembreteId) {
  // endpoint recomendado; se não existir, lança e tratamos fallback
  const { data } = await api.get(`/lembretes/${lembreteId}/grupo`)
  return Array.isArray(data) ? data : []
}

async function listLembretesByCliente(clienteId) {
  const { data } = await api.get(`/lembretes`, { params: { cliente_id: clienteId } })
  return Array.isArray(data) ? data : []
}

export default function LembretesView() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [base, setBase] = useState(null)           // lembrete "base" (o da URL)
  const [clienteNome, setClienteNome] = useState('-')

  const [grupo, setGrupo] = useState([])           // irmãos (um por canal)
  const [grpLoading, setGrpLoading] = useState(true)

  const [occ, setOcc] = useState([])               // ocorrências unificadas
  const [occLoading, setOccLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [bulkBusy, setBulkBusy] = useState(false)
  const [toggleBusyId, setToggleBusyId] = useState(null)

  // Carrega o lembrete base + cliente
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const l = await getLembrete(id)
        if (!mounted) return
        setBase(l)

        // cliente: tenta direto; senão busca lista e resolve
        if (l?.cliente?.nome) {
          setClienteNome(l.cliente.nome)
        } else if (l?.cliente_id) {
          try {
            const { data: cls } = await getClientes()
            if (!mounted) return
            const arr = Array.isArray(cls) ? cls : []
            const found = arr.find(c => c.id === l.cliente_id)
            setClienteNome(found?.nome || '-')
          } catch {
            setClienteNome('-')
          }
        }
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Falha ao carregar lembrete')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  // Carrega grupo de lembretes (um por canal)
  useEffect(() => {
    if (!base) return
    let mounted = true
    ;(async () => {
      setGrpLoading(true)
      try {
        let siblings = []
        try {
          siblings = await getGrupoByEndpoint(base.id)
        } catch {
          // Fallback: lista por cliente e filtra por mesmo título + mesmo "tipo"
          const todos = await listLembretesByCliente(base.cliente_id)
          const isPeriodico = !!base.rrule
          siblings = todos.filter(x =>
            x.titulo === base.titulo &&
            (!!x.rrule === isPeriodico) &&
            (isPeriodico || x.fatura_id === base.fatura_id) // para fatura, confere fatura_id também
          )
        }
        if (!mounted) return
        // ordena por canal p/ consistência
        siblings.sort((a, b) => (a.canal || '').localeCompare(b.canal || ''))
        setGrupo(siblings)
      } finally {
        if (mounted) setGrpLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [base])

  // Carrega ocorrências de todos os canais do grupo e unifica
  useEffect(() => {
    if (!grupo?.length) { setOcc([]); return }
    let mounted = true
    ;(async () => {
      setOccLoading(true)
      try {
        const all = []
        for (const l of grupo) {
          // para cada canal, pega ocorrências
          const ocs = await getOcorrencias(l.id, 200)
          for (const o of ocs) {
            all.push({
              ...o,
              _canal: l.canal,
              _lembrete_id: l.id,
            })
          }
        }
        if (!mounted) return
        all.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        setOcc(all)
        setPage(1)
      } catch {
        if (!mounted) return
        setOcc([])
      } finally {
        if (mounted) setOccLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [grupo])

  // paginação client-side das ocorrências unificadas
  const totalPages = Math.max(1, Math.ceil(occ.length / PAGE_SIZE))
  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return occ.slice(start, start + PAGE_SIZE)
  }, [occ, page])

  const tipoLabel = useMemo(
    () => (base?.rrule ? 'Periódico (RRULE)' : 'Fatura (Relativos)'),
    [base]
  )

  const nextExecGrupo = useMemo(() => {
    const dates = (grupo || [])
      .map(g => g.proxima_execucao_at)
      .filter(Boolean)
      .map((d) => new Date(d))
    if (!dates.length) return null
    dates.sort((a, b) => a - b)
    return dates[0].toISOString()
  }, [grupo])

  // === ações ===
  const toggleChannel = async (lembreteId, ativa) => {
    setToggleBusyId(lembreteId)
    try {
      await updateLembrete(lembreteId, { ativa: !ativa })
      setGrupo(prev => prev.map(g => g.id === lembreteId ? { ...g, ativa: !ativa } : g))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Falha ao atualizar status')
    } finally {
      setToggleBusyId(null)
    }
  }

  const toggleAll = async (toActive) => {
    setBulkBusy(true)
    try {
      const list = grupo || []
      for (const g of list) {
        if (!!g.ativa !== toActive) {
          await updateLembrete(g.id, { ativa: toActive })
        }
      }
      setGrupo(prev => prev.map(g => ({ ...g, ativa: toActive })))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Falha ao atualizar status do grupo')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Lembrete</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/lembretes')}>Voltar</Button>
          {/* Pausar/Retomar todos */}
          {grupo?.length > 0 && (
            <>
              <Button
                variant="danger"
                onClick={() => toggleAll(false)}
                disabled={bulkBusy}
                title="Pausar todos os canais"
              >
                {bulkBusy ? 'Atualizando...' : 'Pausar todos'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => toggleAll(true)}
                disabled={bulkBusy}
                title="Retomar todos os canais"
              >
                {bulkBusy ? 'Atualizando...' : 'Retomar todos'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Card de dados do lembrete */}
      <Card className="p-5">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-2/3" />
            <div className="skeleton h-6 w-1/2" />
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !base ? (
          <div className="text-slate-500">Lembrete não encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* coluna 1 */}
            <div className="space-y-3">
              <div>
                <Label className="text-slate-500">Título</Label>
                <div className="mt-1 font-medium">{base.titulo || '-'}</div>
              </div>

              <div>
                <Label className="text-slate-500">Cliente</Label>
                <div className="mt-1">{clienteNome}</div>
              </div>

              <div>
                <Label className="text-slate-500">Tipo</Label>
                <div className="mt-1">{tipoLabel}</div>
              </div>

              <div>
                <Label className="text-slate-500">Próxima Execução (grupo)</Label>
                <div className="mt-1">{fmtDateTime(nextExecGrupo)}</div>
              </div>
            </div>

            {/* coluna 2 */}
            <div className="space-y-3">
              {base.rrule ? (
                <>
                  <div>
                    <Label className="text-slate-500">Início (dtstart)</Label>
                    <div className="mt-1">{fmtDateTime(base.dtstart)}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500">RRULE</Label>
                    <div className="mt-1 break-words">{base.rrule}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-slate-500">Fatura</Label>
                    <div className="mt-1">{base.fatura_id || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Condição padrão</Label>
                    <div className="mt-1">{base.condicao || '-'}</div>
                  </div>
                </>
              )}

              {base.meta && Object.keys(base.meta || {}).length > 0 && (
                <div>
                  <Label className="text-slate-500">Meta</Label>
                  <pre className="mt-1 text-xs bg-slate-50 rounded p-2 border" style={{ borderColor: 'var(--border)' }}>
                    {JSON.stringify(base.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* corpo ocupa a linha toda */}
            <div className="md:col-span-2">
              <Label className="text-slate-500">Corpo (mensagem)</Label>
              <div className="mt-1 whitespace-pre-wrap bg-slate-50 rounded p-3 border" style={{ borderColor: 'var(--border)' }}>
                {base.corpo || '-'}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Canais do grupo */}
      <Card className="p-5">
        <h2 className="h2 mb-3">Canais</h2>
        {grpLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-4/5" />
          </div>
        ) : (grupo?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {grupo.map((g) => (
              <div key={g.id} className="border rounded p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="capitalize font-medium">{g.canal}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.ativa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {g.ativa ? 'Ativo' : 'Pausado'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Próxima execução: <strong>{fmtDateTime(g.proxima_execucao_at)}</strong>
                </div>
                <div className="mt-3 text-right">
                  <Button
                    variant={g.ativa ? 'danger' : 'secondary'}
                    onClick={() => toggleChannel(g.id, g.ativa)}
                    disabled={toggleBusyId === g.id}
                  >
                    {toggleBusyId === g.id ? 'Atualizando...' : (g.ativa ? 'Pausar' : 'Retomar')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500">Nenhum canal relacionado encontrado.</div>
        ))}
      </Card>

      {/* Ocorrências unificadas (com coluna Canal) + paginação */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 pt-5 flex items-center justify-between">
          <h2 className="h2">Ocorrências</h2>
          <div className="flex items-center gap-2 pr-5">
            <span className="text-sm text-slate-600">
              {occ.length} ocorrência(s)
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-3 font-semibold">Agendado</th>
                <th className="py-2 px-3 font-semibold">Canal</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold">Enviado em</th>
                <th className="py-2 px-3 font-semibold">Tentativas</th>
                <th className="py-2 px-3 font-semibold">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {occLoading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <div className="skeleton h-8 w-full" />
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">Nenhuma ocorrência.</td>
                </tr>
              ) : (
                pageData.map((o) => (
                  <tr key={`${o._lembrete_id}|${o.id}`} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 px-3">{fmtDateTime(o.scheduled_at)}</td>
                    <td className="py-2 px-3 capitalize">{o._canal}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.status === 'enviado' ? 'bg-emerald-50 text-emerald-700'
                        : o.status === 'erro' ? 'bg-red-50 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">{fmtDateTime(o.enviado_em)}</td>
                    <td className="py-2 px-3">{o.tentativas ?? '-'}</td>
                    <td className="py-2 px-3">
                      <div className="truncate max-w-[420px]" title={o.mensagem_erro || ''}>
                        {o.mensagem_erro || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* paginação */}
        {!occLoading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-slate-600">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPage(1)} disabled={page === 1}>« Primeiro</Button>
              <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Anterior</Button>
              <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próximo ›</Button>
              <Button variant="ghost" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Último »</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
