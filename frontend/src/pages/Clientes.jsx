import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { getClientes } from '../services/clientes'

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function fetchClientes() {
      setLoading(true)
      setError('')
      try {
        const { data } = await getClientes()
        if (mounted) setClientes(Array.isArray(data) ? data : [])
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Falha ao carregar clientes')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchClientes()
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

  const qNorm = normalize(busca)
  const qDigits = onlyDigits(busca)

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

  const handleNovo = () => navigate('/clientes/novo')
  const handleEditar = (id) => navigate(`/clientes/${id}`)

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

              {!loading && !error && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">Nenhum cliente encontrado.</td>
                </tr>
              )}

              {!loading && !error && filtrados.map((c) => (
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
      </Card>
    </div>
  )
}
