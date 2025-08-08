import { useEffect, useState } from 'react'
import { InputMask } from '@react-input/mask'
import { mask } from "remask"

export default function ClientesForm({ aberto, cliente, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: ''
  })

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        documento: cliente.documento || ''
      })
    } else {
      setForm({ nome: '', email: '', telefone: '', documento: '' })
    }
  }, [cliente])

  // handleChange normal para todos os campos, menos documento
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // handle para documento, com máscara dinâmica
  function handleChangeMask(e) {
    const value = e.target.value.replace(/\D/g, "")
    const masked = mask(value, [
      "999.999.999-99",        // CPF
      "99.999.999/9999-99"     // CNPJ
    ])
    setForm({ ...form, documento: masked })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSalvar(form)
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">
          {cliente ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nome"
            placeholder="Nome"
            className="w-full border border-subtle rounded px-3 py-2"
            value={form.nome}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full border border-subtle rounded px-3 py-2"
            value={form.email}
            onChange={handleChange}
          />

          <InputMask
            mask={"(__) _____-____"}
            replacement={{ _: /\d/ }}
            value={form.telefone}
            onChange={handleChange}
            name="telefone"
            type="tel"
            placeholder="Telefone"
            className="w-full border border-subtle rounded px-3 py-2"
          />

          <input
            name="documento"
            value={form.documento}
            onChange={handleChangeMask}
            placeholder="CPF ou CNPJ"
            className="w-full border border-subtle rounded px-3 py-2"
            maxLength={18} // máximo para CNPJ
            inputMode="numeric"
          />

          <div className="flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded bg-subtle text-sm hover:bg-gray-300"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded bg-secondary text-white hover:bg-primary"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
