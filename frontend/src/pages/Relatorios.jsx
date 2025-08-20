// src/pages/Relatorios.jsx
import { NavLink, Outlet } from 'react-router-dom'

export default function Relatorios() {
  const tabBase = 'px-4 py-2 text-sm rounded-xl border'
  const active = 'bg-slate-900 text-white border-slate-900'
  const idle = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-slate-500">Cobranças e Lembretes</p>
        </div>
        <div className="flex gap-2">
          <NavLink to="/relatorios/cobrancas" className={({ isActive }) => `${tabBase} ${isActive ? active : idle}`}>
            Cobranças
          </NavLink>
          <NavLink to="/relatorios/lembretes" className={({ isActive }) => `${tabBase} ${isActive ? active : idle}`}>
            Lembretes
          </NavLink>
        </div>
      </div>

      {/* Aqui renderiza a página filha (cobrancas/lembretes) */}
      <Outlet />
    </div>
  )
}

/* =========================
  Rotas esperadas no seu Router (exemplo):

  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
  import Relatorios from './pages/Relatorios'
  import RelatoriosCobrancas from './pages/RelatoriosCobrancas'
  import RelatoriosLembretes from './pages/RelatoriosLembretes'

  <Routes>
    <Route path="/relatorios" element={<Relatorios />}> 
      <Route index element={<Navigate to="/relatorios/cobrancas" replace />} />
      <Route path="cobrancas" element={<RelatoriosCobrancas />} />
      <Route path="lembretes" element={<RelatoriosLembretes />} />
    </Route>
  </Routes>

  E no menu lateral, linkar para "/relatorios/cobrancas" (ou "/relatorios")
========================= */
