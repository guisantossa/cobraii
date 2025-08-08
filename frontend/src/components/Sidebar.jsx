import { Link } from 'react-router-dom'
import {
  FaTachometerAlt, FaMoneyCheckAlt, FaUsers,
  FaChartBar, FaFileAlt, FaClipboardList
} from 'react-icons/fa'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar text-primary min-h-screen fixed top-0 left-0 z-50">
      <div className="p-6 text-2xl font-display font-black flex items-center justify-between">
        Cobraii <span className="text-highlight">⚡</span>
      </div>

      <nav className="mt-6 flex flex-col gap-4 px-6 text-sm font-semibold">
        <Link to="/dashboard" className="hover:text-highlight flex items-center gap-2">
          <FaTachometerAlt className="text-secondary" /> Dashboard
        </Link>
        <Link to="/cobrancas" className="hover:text-highlight flex items-center gap-2">
          <FaMoneyCheckAlt className="text-secondary" /> Cobranças
        </Link>
        <Link to="/clientes" className="hover:text-highlight flex items-center gap-2">
          <FaUsers className="text-secondary" /> Clientes
        </Link>
        <Link to="/relatorios" className="hover:text-highlight flex items-center gap-2">
          <FaChartBar className="text-secondary" /> Relatórios
        </Link>
        <Link to="/logs" className="hover:text-highlight flex items-center gap-2">
          <FaClipboardList className="text-secondary" /> Logs
        </Link>
      </nav>
    </aside>
  )
}
