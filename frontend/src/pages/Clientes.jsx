// pages/Clientes.jsx
import { useEffect, useState } from 'react'
import {
  listarClientes,
  criarCliente,
  atualizarCliente,
  deletarCliente
} from '../services/clientes'
import ClientesTabela from '../components/ClientesTabela'
import ClientesForm from '../components/ClientesForm'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [formAberto, setFormAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

  const carregarClientes = async () => {
    try {
      const res = await listarClientes()
      setClientes(res.data)
    } catch (err) {
      console.error('Erro ao listar clientes:', err)
    }
  }

  const handleSalvar = async (formData) => {
    try {
      if (clienteSelecionado) {
        await atualizarCliente(clienteSelecionado.id, formData)
      } else {
        await criarCliente(formData)
      }
      setFormAberto(false)
      setClienteSelecionado(null)
      carregarClientes()
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
    }
  }

  const handleEditar = (cliente) => {
    setClienteSelecionado(cliente)
    setFormAberto(true)
  }

  const handleNovo = () => {
    setClienteSelecionado(null)
    setFormAberto(true)
  }

  const handleExcluir = async (cliente) => {
    if (!confirm(`Deseja excluir o cliente ${cliente.nome}?`)) return
    try {
      await deletarCliente(cliente.id)
      carregarClientes()
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-display text-primary font-bold">Clientes</h1>
        <button
          className="bg-secondary hover:bg-primary text-white px-4 py-2 rounded-xl shadow-md"
          onClick={handleNovo}
        >
          Novo Cliente
        </button>
      </div>

      <ClientesTabela
        clientes={clientes}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
      />

      <ClientesForm
        aberto={formAberto}
        cliente={clienteSelecionado}
        onSalvar={handleSalvar}
        onFechar={() => {
          setFormAberto(false)
          setClienteSelecionado(null)
        }}
      />
    </div>
  )
}
