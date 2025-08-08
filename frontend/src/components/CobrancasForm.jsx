import { useState, useEffect } from 'react'

export default function CobrancasForm({ cobranca, onSalvar, onCancelar }) {
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [clienteId, setClienteId] = useState('')

  useEffect(() => {
    if (cobranca) {
      setValor(cobranca.valor)
      setDescricao(cobranca.descricao || '')
      setVencimento(cobranca.vencimento)
      setClienteId(cobranca.cliente_id)
    }
  }, [cobranca])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSalvar({ valor, descricao, vencimento, cliente_id: clienteId })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-bold">
          {cobranca ? 'Editar' : 'Nova'} Cobrança
        </h2>

        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="text"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="text"
          placeholder="ID do Cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancelar}
            className="text-gray-500 hover:underline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
