// src/routes/index.jsx
import { Routes, Route, Outlet } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import AppShell from '../components/AppShell'

import Dashboard from '../pages/Dashboard'
import Cobrancas from '../pages/Cobrancas'
import CobrancasForm from '../pages/CobrancasForm'
import Clientes from '../pages/Clientes'
import ClientesForm from '../pages/ClientesForm'
import CobrancasView from '../pages/CobrancasView'
import Relatorios from '../pages/Relatorios'
import Logs from '../pages/Logs'
import Login from '../pages/Login'

import Lembretes from '../pages/Lembretes'
import LembretesForm from '../pages/LembretesForm'
import LembretesView from '../pages/LembretesView'


function Layout() {
  return (
    <PrivateRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </PrivateRoute>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Protegidas com layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />


        <Route path="/cobrancas" element={<Cobrancas />} />
        <Route path="/cobrancas/novo" element={<CobrancasForm />} />
        <Route path="/cobrancas/editar/:id" element={<CobrancasForm />} />
        <Route path="/cobrancas/:id" element={<CobrancasView />} />

        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/novo" element={<ClientesForm />} />
        <Route path="/clientes/:id" element={<ClientesForm />} />
        
        
        <Route path="/lembretes" element={<Lembretes />} />
        <Route path="/lembretes/novo" element={<LembretesForm />} />
        <Route path="/lembretes/:id" element={<LembretesView />} />
        <Route path="/lembretes/editar/:id" element={<LembretesForm />} />

        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/logs" element={<Logs />} />



        {/* Fallback */}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
