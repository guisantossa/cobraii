// src/components/AppShell.jsx
import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { LayoutGrid, Users, CreditCard, Bell, Settings, LogOut, Clock } from 'lucide-react'
import { getUsuarioLogado } from '../services/usuarios'
import { useAuth } from '../auth/AuthContext'

export default function AppShell() {
  const { token, logout } = useAuth()
  const [usuario, setUsuario] = useState({ nome: '' })
  const [dataHora, setDataHora] = useState('')


  // Busca apenas se houver token; desloga SOMENTE em 401/403
  useEffect(() => {
    if (!token) return

    let cancelled = false

    ;(async () => {
      try {
        const dados = await getUsuarioLogado()
        if (!cancelled) setUsuario(dados)
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          logout()
        } else {
          console.error('Falha ao buscar usuário logado:', err)
        }
      }
    })()

    return () => { cancelled = true }
  }, [token, logout])

  // Data e hora em tempo real
  useEffect(() => {
    const tick = () => {
      const agora = new Date()
      const d = agora.toLocaleDateString('pt-BR')
      const h = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      setDataHora(`${d} • ${h}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-[var(--bg)]">
      {/* Sidebar */}
      <aside className="bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] w-9 h-9 rounded-lg flex items-center justify-center font-bold">
              C
            </div>
            <span className="font-bold text-lg">Cobraii</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <SideItem to="/dashboard" icon={<LayoutGrid size={18} />}>Dashboard</SideItem>
          <SideItem to="/clientes" icon={<Users size={18} />}>Clientes</SideItem>
          <SideItem to="/cobrancas" icon={<CreditCard size={18} />}>Cobranças</SideItem>
          <SideItem to="/lembretes" icon={<CreditCard size={18} />}>Lembretes</SideItem>
          <SideItem to="/templates" icon={<CreditCard size={18} />}>Templates</SideItem>
          <SideItem to="/relatorios" icon={<CreditCard size={18} />}>Relatórios</SideItem>
          <SideItem to="/historicos" icon={<CreditCard size={18} />}>Histórico</SideItem>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-h-screen">
        {/* Navbar / Header */}
        <header className="h-14 bg-white border-b border-[var(--border)] flex items-center justify-between px-6">
          <h1 className="font-bold">Painel</h1>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={16} />
              <span>{dataHora}</span>
            </div>
            <span className="text-slate-800 font-medium truncate max-w-[220px]" title={usuario?.nome}>
              {usuario?.nome || '—'}
            </span>
            <button
              type="button"
              onClick={() => alert('Abrir configurações')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--border)] hover:bg-slate-50 transition"
              aria-label="Configurações"
              title="Configurações"
            >
              <Settings size={18} className="text-slate-700" />
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--border)] hover:bg-red-50 transition"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={18} className="text-red-500" />
            </button>
          </div>
        </header>

        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SideItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition ${isActive ? 'bg-slate-800' : ''}`
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}
