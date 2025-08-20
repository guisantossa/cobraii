// src/components/AppShell.jsx
import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CircleDollarSign,
  ListOrdered,
  BellPlus,
  BellRing,
  FilePlus,
  Files,
  BarChart3,
  LineChart,
  History,
  ScrollText,
  Settings,
  LogOut,
  Clock,
} from 'lucide-react'

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
          {/* Dashboard */}
          <SideItem to="/dashboard" end icon={<LayoutDashboard size={18} />}>Dashboard</SideItem>

          {/* Clientes */}
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Clientes
          </div>
          <SideItem to="/clientes/novo" end icon={<UserPlus size={18} />}>Adicionar</SideItem>
          <SideItem to="/clientes" end icon={<Users size={18} />}>Listar</SideItem>

          {/* Cobranças */}
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Cobranças
          </div>
          <SideItem to="/cobrancas/novo" end icon={<CircleDollarSign size={18} />}>Adicionar</SideItem>
          <SideItem to="/cobrancas" end icon={<ListOrdered size={18} />}>Listar</SideItem>

          {/* Lembretes */}
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Lembretes
          </div>
          <SideItem to="/lembretes/novo" end icon={<BellPlus size={18} />}>Adicionar</SideItem>
          <SideItem to="/lembretes" end icon={<BellRing size={18} />}>Listar</SideItem>

          {/* Templates */}
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Templates
          </div>
          <SideItem to="/templates/novo" end icon={<FilePlus size={18} />}>Adicionar</SideItem>
          <SideItem to="/templates" end icon={<Files size={18} />}>Listar</SideItem>

          {/* Relatórios */}
          <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Relatórios
          </div>
          <SideItem to="/relatorios/cobrancas" end icon={<BarChart3 size={18} />}>Cobranças</SideItem>
          <SideItem to="/relatorios/lembretes" end icon={<LineChart size={18} />}>Lembretes</SideItem>

          {/* Outros */}
          <SideItem to="/historicos" end icon={<History size={18} />}>Histórico</SideItem>
          <SideItem to="/logs" end icon={<ScrollText size={18} />}>Logs</SideItem>
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

function SideItem({ to, icon, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition ${
          isActive ? 'bg-slate-800' : ''
        }`
      }
    >
      {icon}
      <span className="truncate">{children}</span>
    </NavLink>
  )
}
