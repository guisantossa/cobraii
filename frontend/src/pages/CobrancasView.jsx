import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Label } from '../components/ui/Label'
import { getCobranca } from '../services/cobrancas'
import { getFaturasByCobranca } from '../services/faturas'

/**
 * Tela de Visualização de Cobrança (somente leitura)
 * - Mostra dados da cobrança sem permitir edição
 * - Lista as faturas associadas (GET /api/v1/faturas?cobranca_id=:id)
 * - Botão "Criar lembrete" (ainda sem ação)
 */
export default function CobrancasView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = useMemo(() => Boolean(id), [id]) // apenas para manter padrão, mas aqui é view

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cobranca, setCobranca] = useState(null)
  const [faturas, setFaturas] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const [cobrancaRes, faturasRes] = await Promise.all([
          getCobranca(id),
          getFaturasByCobranca(id)
        ])
        if (!mounted) return
        setCobranca(cobrancaRes?.data || null)
        setFaturas(Array.isArray(faturasRes?.data) ? faturasRes.data : [])
      } catch (err) {
        setError(parseApiError(err))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  function parseApiError(err) {
    const detail = err?.response?.data?.detail
    if (Array.isArray(detail)) {
      return detail
        .map(d => {
          const path = Array.isArray(d.loc) ? d.loc.join('.') : ''
          return `${path ? `[${path}] ` : ''}${d.msg}`
        })
        .join(' | ')
    }
    if (typeof detail === 'string') return detail
    return err?.message || 'Falha ao carregar dados'
  }

  function formatCurrencyBRL(v) {
    if (v === null || v === undefined) return '-'
    const num = Number(v)
    if (Number.isNaN(num)) return '-'
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDateISO(d) {
    if (!d) return '-'
    // aceita Date ou string YYYY-MM-DD
    try {
      const dt = typeof d === 'string' && d.length === 10 ? new Date(`${d}T00:00:00`) : new Date(d)
      if (Number.isNaN(dt.getTime())) return '-'
      return dt.toLocaleDateString('pt-BR')
    } catch {
      return '-'
    }
  }

  const statusFatura = (f) => (f?.data_pagamento ? 'paga' : 'pendente')

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-5xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">Cobrança</h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/cobrancas')}>Voltar</Button>
            {/* Opcional: ação de editar poderia ir para /cobrancas/:id/editar */}
            <Button variant="secondary" onClick={() => navigate(`/cobrancas/editar/${id}`)}>Editar</Button>
            <Button type="button" onClick={() => { /* sem ação por enquanto */ }}>
              Criar lembrete
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !cobranca ? (
          <p className="text-sm text-slate-500">Cobrança não encontrada.</p>
        ) : (
          <div className="space-y-8">
            {/* Bloco: Dados da cobrança (somente leitura) */}
            <section>
              <h2 className="h2 mb-3">Dados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase text-slate-500">Título</Label>
                  <div className="mt-1">{cobranca.titulo || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs uppercase text-slate-500">Recorrência</Label>
                  <div className="mt-1 capitalize">{cobranca.recorrencia || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase text-slate-500">Descrição</Label>
                  <div className="mt-1">{cobranca.descricao || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs uppercase text-slate-500">Cliente</Label>
                  <div className="mt-1">
                    {cobranca.cliente_id
                      ? (<Link className="text-blue-600 hover:underline" to={`/clientes/${cobranca.cliente_id}`}>{cobranca.cliente.nome || 'Cliente pré-cadastrado'}</Link>)
                      : (cobranca.cliente_nome_avulso || '— avulso —')}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase text-slate-500">Valor</Label>
                  <div className="mt-1">{formatCurrencyBRL(cobranca.valor)}</div>
                </div>
                <div>
                  <Label className="text-xs uppercase text-slate-500">Vencimento</Label>
                  <div className="mt-1">{formatDateISO(cobranca.vencimento)}</div>
                </div>
              </div>
            </section>

            {/* Bloco: Faturas da cobrança */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="h2">Faturas</h2>
              </div>

              {faturas.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma fatura gerada para esta cobrança.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Valor</th>
                        <th className="text-left p-3 font-medium">Vencimento</th>
                        <th className="text-left p-3 font-medium">Pagamento</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturas.map((f, idx) => (
                        <tr key={f.id} className={idx % 2 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3">{formatCurrencyBRL(f.valor)}</td>
                          <td className="p-3">{formatDateISO(f.vencimento)}</td>
                          <td className="p-3">{formatDateISO(f.data_pagamento)}</td>
                          <td className="p-3 capitalize">
                            <span className={statusFatura(f) === 'paga' ? 'text-emerald-600' : 'text-amber-600'}>
                              {statusFatura(f)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </Card>
    </div>
  )
}
