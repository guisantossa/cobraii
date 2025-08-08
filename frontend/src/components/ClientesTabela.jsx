// components/ClientesTabela.jsx
import { FaEdit, FaTrash } from 'react-icons/fa'

export default function ClientesTabela({ clientes, onEditar, onExcluir }) {
  return (
    <table className="w-full text-sm text-left border border-subtle">
      <thead className="bg-subtle text-xs uppercase">
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
          <tr key={cliente.id} className="border-t">
            <td className="px-4 py-2">{cliente.nome}</td>
            <td className="px-4 py-2">{cliente.email}</td>
            <td className="px-4 py-2">{cliente.telefone}</td>
            <td className="px-4 py-2">{cliente.documento}</td>
            <td className="px-4 py-2 text-right space-x-2">
              <button
                className="text-secondary hover:text-primary"
                onClick={() => onEditar(cliente)}
              >
                <FaEdit />
              </button>
              <button
                className="text-danger hover:text-primary"
                onClick={() => onExcluir(cliente)}
              >
                <FaTrash />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
