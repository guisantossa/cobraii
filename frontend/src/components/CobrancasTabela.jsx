import { FaEdit, FaTrash } from 'react-icons/fa'

export default function CobrancasTabela({ cobrancas, onEditar, onCancelar }) {
  return (
    <table className="w-full border text-sm text-left">
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
        {cobrancas.map((c) => (
          <tr key={c.id} className="border-t">
            <td className="px-4 py-2">{c.cliente?.nome || '-'}</td>
            <td className="px-4 py-2">R$ {Number(c.valor).toFixed(2)}</td>
            <td className="px-4 py-2">{c.vencimento}</td>
            <td className="px-4 py-2">{c.status}</td>
            <td className="px-4 py-2 text-right space-x-2">
              <button
                onClick={() => onEditar(c)}
                className="text-blue-600 hover:underline"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => onCancelar(c.id)}
                className="text-red-600 hover:underline"
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
