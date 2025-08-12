import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  // Dados fictícios
  const resumo = [
    { titulo: 'Clientes', valor: 128 },
    { titulo: 'Pendentes', valor: 42 },
    { titulo: 'Pagas', valor: 310 },
    { titulo: 'Recebido', valor: 'R$ 24.500,00' }
  ]

  const dadosGrafico = [
    { mes: 'Mar', valor: 3200 },
    { mes: 'Abr', valor: 2800 },
    { mes: 'Mai', valor: 4100 },
    { mes: 'Jun', valor: 3700 },
    { mes: 'Jul', valor: 4500 },
    { mes: 'Ago', valor: 3900 },
  ]

  const ultimasCobrancas = [
    { id: 1, cliente: 'João Silva', valor: 'R$ 500,00', status: 'Pendente', vencimento: '10/08/2025' },
    { id: 2, cliente: 'Maria Souza', valor: 'R$ 1.200,00', status: 'Paga', vencimento: '08/08/2025' },
    { id: 3, cliente: 'Empresa X', valor: 'R$ 3.000,00', status: 'Paga', vencimento: '05/08/2025' },
    { id: 4, cliente: 'Carlos Lima', valor: 'R$ 750,00', status: 'Pendente', vencimento: '12/08/2025' },
    { id: 5, cliente: 'Ana Paula', valor: 'R$ 2.500,00', status: 'Paga', vencimento: '01/08/2025' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="h1">Dashboard</h1>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {resumo.map((item, i) => (
          <Card key={i} className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-sm text-slate-500">{item.titulo}</span>
            <span className="text-2xl font-bold">{item.valor}</span>
          </Card>
        ))}
      </div>

      {/* Gráfico de Cobranças */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Cobranças - Últimos 6 meses</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valor" fill="#5E2CA5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Últimas Cobranças */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Últimas Cobranças</h2>
          <Button variant="outline" onClick={() => window.location.href = '/cobrancas'}>Ver todas</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 px-4">Cliente</th>
                <th className="py-2 px-4">Valor</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {ultimasCobrancas.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-4">{c.cliente}</td>
                  <td className="py-2 px-4">{c.valor}</td>
                  <td className="py-2 px-4">{c.status}</td>
                  <td className="py-2 px-4">{c.vencimento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
