import { Routes, Route } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Cobrancas from '../pages/Cobrancas'
import Clientes from '../pages/Clientes'
import Relatorios from '../pages/Relatorios'
import Logs from '../pages/Logs'
import Login from '../pages/Login'
import PrivateRoute from './PrivateRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/cobrancas"
        element={
          <PrivateRoute>
            <Cobrancas />
          </PrivateRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <PrivateRoute>
            <Clientes />
          </PrivateRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <PrivateRoute>
            <Relatorios />
          </PrivateRoute>
        }
      />
      <Route
        path="/logs"
        element={
          <PrivateRoute>
            <Logs />
          </PrivateRoute>
        }
      />

      {/* Redirecionamento padrão */}
      <Route path="*" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    </Routes>
  )
}
