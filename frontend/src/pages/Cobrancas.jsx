import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Eye, Bell } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { getCobrancas } from '../services/cobrancas'

export default function Cobrancas() {
  const navigate = useNavigate()
  const [cobrancas, setCobrancas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function fetchCobrancas() {
      setLoading(true)
      setError('')
      try {
        const { data } = await getCobrancas()
        if (mounted) setCobrancas(Array.isArray(data) ? data : [])
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Falha ao carregar cobranças')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCobrancas()
    return () => { mounted = false }
  }, [])

  const toStr = (v) => (v ?? '').toString()
  const normalize = (v) =>
    toStr(v)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const qNorm = normalize(busca)

  const filtradas = useMemo(() => {
    if (!qNorm) return cobrancas
    return cobrancas.filter((c) => {
      const nomeCliente = normalize(c?.cliente?.nome || c?.cliente_nome_avulso)
      return nomeCliente.includes(qNorm)
    })
  }, [cobrancas, qNorm])

  const handleNovo = () => navigate('/cobrancas/novo')
  const handleEditar = (id) => navigate(`/cobrancas/editar/${id}`)
  const handleVisualizar = (id) => navigate(`/cobrancas/${id}`)
  const handleCriarLembrete = (id) => {
    alert('Em breve: criar lembrete para esta cobrança.')
  }

  const fmtBRL = (v) => {
    const num = Number(v ?? 0)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }
  const fmtData = (iso) => {
    if (!iso) return '-'
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Cobranças</h1>
        <Button onClick={handleNovo}><Plus size={16}/> Nova Cobrança</Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por nome do cliente"
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
                <th className="md:w-[20%] py-2 px-3 font-semibold">Título</th>
                <th className="md:w-[20%] py-2 px-3 font-semibold">Cliente</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Valor</th>
                <th className="md:w-[16%] py-2 px-3 font-semibold">Vencimento</th>
                <th className="md:w-[38%] py-2 px-3 font-semibold w-[220px]">Ações</th>
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

              {!loading && !error && filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">Nenhuma cobrança encontrada.</td>
                </tr>
              )}

              {!loading && !error && filtradas.map((c) => (
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
                      <button className="c-btn c-btn--ghost" onClick={() => handleCriarLembrete(c.id)}>
                        <Bell size={14}/> Criar Lembrete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
