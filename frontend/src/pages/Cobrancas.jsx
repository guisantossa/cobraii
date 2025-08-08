// pages/Cobrancas.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarCobrancas, cancelarCobranca } from '../services/cobrancas'

export default function Cobrancas() {
  const [cobrancas, setCobrancas] = useState([])
  const navigate = useNavigate()

  const carregarCobrancas = async () => {
    try {
      const res = await listarCobrancas()
      setCobrancas(res.data)
    } catch (err) {
      alert('Erro ao listar cobranças')
    }
  }

  const handleNovo = () => navigate('/cobrancas/novo')
  const handleEditar = (id) => navigate(`/cobrancas/${id}`)
  const handleExcluir = async (cobranca) => {
    if (!window.confirm(`Excluir cobrança de valor R$ ${cobranca.valor}?`)) return
    try {
      await cancelarCobranca(cobranca.id)
      carregarCobrancas()
    } catch (err) {
      alert('Erro ao excluir cobrança')
    }
  }

  useEffect(() => { carregarCobrancas() }, [])

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Cobranças</h1>
        <button
          className="bg-secondary hover:bg-primary text-white px-6 py-2 rounded-xl shadow font-bold transition"
          onClick={handleNovo}
        >
          Nova Cobrança
        </button>
      </div>
      <div className="bg-white shadow rounded-2xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Vencimento</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cobrancas.map(cobranca => (
              <tr key={cobranca.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{cobranca.cliente?.nome || '-'}</td>
                <td className="px-4 py-2">R$ {Number(cobranca.valor).toFixed(2)}</td>
                <td className="px-4 py-2">{cobranca.vencimento}</td>
                <td className="px-4 py-2">{cobranca.status}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    className="text-secondary hover:text-primary font-bold"
                    onClick={() => handleEditar(cobranca.id)}
                  >Editar</button>
                  <button
                    className="text-danger hover:text-primary font-bold"
                    onClick={() => handleExcluir(cobranca)}
                  >Excluir</button>
                </td>
              </tr>
            ))}
            {cobrancas.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  Nenhuma cobrança cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
