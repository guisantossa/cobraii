// pages/CobrancaForm.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { criarCobranca, atualizarCobranca, obterCobranca } from '../services/cobrancas'
import { listarClientes } from '../services/clientes'

export default function CobrancaForm() {
  const [form, setForm] = useState({
    valor: '',
    descricao: '',
    vencimento: '',
    cliente_id: ''
  })
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    listarClientes().then(res => setClientes(res.data))
    if (id) {
      setLoading(true)
      obterCobranca(id)
        .then(res => setForm(res.data))
        .catch(() => setErro('Erro ao carregar cobrança'))
        .finally(() => setLoading(false))
    }
  }, [id])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    try {
      if (id) {
        await atualizarCobranca(id, form)
      } else {
        await criarCobranca(form)
      }
      navigate('/cobrancas')
    } catch {
      setErro('Erro ao salvar cobrança')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8 bg-white shadow rounded-2xl">
      <h1 className="text-xl font-bold mb-4 text-primary">
        {id ? 'Editar Cobrança' : 'Nova Cobrança'}
      </h1>
      {erro && <div className="mb-4 text-red-500">{erro}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="valor" className="block font-medium mb-1">Valor *</label>
          <input
            id="valor"
            name="valor"
            type="number"
            min="0"
            step="0.01"
            className="w-full border rounded-xl px-4 py-2 focus:outline-primary"
            value={form.valor}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="descricao" className="block font-medium mb-1">Descrição</label>
          <input
            id="descricao"
            name="descricao"
            type="text"
            className="w-full border rounded-xl px-4 py-2"
            value={form.descricao}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="vencimento" className="block font-medium mb-1">Vencimento *</label>
          <input
            id="vencimento"
            name="vencimento"
            type="date"
            className="w-full border rounded-xl px-4 py-2"
            value={form.vencimento}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="cliente_id" className="block font-medium mb-1">Cliente *</label>
          <select
            id="cliente_id"
            name="cliente_id"
            className="w-full border rounded-xl px-4 py-2"
            value={form.cliente_id}
            onChange={handleChange}
            required
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 justify-end mt-6">
          <button
            type="button"
            className="bg-subtle px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-200"
            onClick={() => navigate('/cobrancas')}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-secondary hover:bg-primary text-white px-6 py-2 rounded-xl shadow font-bold"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
