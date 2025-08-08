// pages/Clientes.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarClientes, deletarCliente } from '../services/clientes'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const navigate = useNavigate()

  const carregarClientes = async () => {
    try {
      const res = await listarClientes()
      setClientes(res.data)
    } catch (err) {
      alert('Erro ao listar clientes')
    }
  }

  const handleNovo = () => navigate('/clientes/novo')
  const handleEditar = (id) => navigate(`/clientes/${id}`)
  const handleExcluir = async (cliente) => {
    if (!window.confirm(`Excluir cliente ${cliente.nome}?`)) return
    await deletarCliente(cliente.id)
    carregarClientes()
  }

  useEffect(() => { carregarClientes() }, [])

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Clientes</h1>
        <button
          className="bg-secondary hover:bg-primary text-white px-6 py-2 rounded-xl shadow font-bold transition"
          onClick={handleNovo}
        >
          Novo Cliente
        </button>
      </div>
      <div className="bg-white shadow rounded-2xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Telefone</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(cliente => (
              <tr key={cliente.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{cliente.nome}</td>
                <td className="px-4 py-2">{cliente.email}</td>
                <td className="px-4 py-2">{cliente.telefone}</td>
                <td className="px-4 py-2">{cliente.documento}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    className="text-secondary hover:text-primary font-bold"
                    onClick={() => handleEditar(cliente.id)}
                  >Editar</button>
                  <button
                    className="text-danger hover:text-primary font-bold"
                    onClick={() => handleExcluir(cliente)}
                  >Excluir</button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-8">Nenhum cliente cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
