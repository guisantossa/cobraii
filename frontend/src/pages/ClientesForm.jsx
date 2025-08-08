// pages/ClienteForm.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { criarCliente, atualizarCliente, obterCliente } from '../services/clientes'
import { InputMask } from '@react-input/mask'
import { mask } from 'remask'

export default function ClienteForm() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    if (id) {
      setLoading(true)
      obterCliente(id)
        .then(res => setForm(res.data))
        .catch(() => setErro('Erro ao carregar cliente'))
        .finally(() => setLoading(false))
    }
  }, [id])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleChangeDocumento(e) {
    const value = e.target.value.replace(/\D/g, "")
    const masked = mask(value, [
      "999.999.999-99",
      "99.999.999/9999-99"
    ])
    setForm({ ...form, documento: masked })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    try {
      if (id) {
        await atualizarCliente(id, form)
      } else {
        await criarCliente(form)
      }
      navigate('/clientes')
    } catch {
      setErro('Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8 bg-white shadow rounded-2xl">
      <h1 className="text-xl font-bold mb-4 text-primary">
        {id ? 'Editar Cliente' : 'Novo Cliente'}
      </h1>
      {erro && <div className="mb-4 text-red-500">{erro}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="nome" className="block font-medium mb-1">Nome *</label>
          <input
            id="nome"
            name="nome"
            type="text"
            className="w-full border rounded-xl px-4 py-2 focus:outline-primary"
            value={form.nome}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block font-medium mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full border rounded-xl px-4 py-2"
            value={form.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="telefone" className="block font-medium mb-1">Telefone</label>
          <InputMask
            mask="(__) _____-____"
            replacement={{ _: /\d/ }}
            value={form.telefone}
            onChange={handleChange}
            name="telefone"
            type="tel"
            className="w-full border rounded-xl px-4 py-2"
            placeholder="(99) 99999-9999"
            maxLength={15}
          />
        </div>
        <div>
          <label htmlFor="documento" className="block font-medium mb-1">CPF ou CNPJ</label>
          <input
            id="documento"
            name="documento"
            type="text"
            className="w-full border rounded-xl px-4 py-2"
            value={form.documento}
            onChange={handleChangeDocumento}
            maxLength={18}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            inputMode="numeric"
          />
        </div>
        <div className="flex gap-4 justify-end mt-6">
          <button
            type="button"
            className="bg-subtle px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-200"
            onClick={() => navigate('/clientes')}
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
