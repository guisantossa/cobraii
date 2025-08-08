import { FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../auth/AuthContext'

export default function Navbar() {
  const user = { nome: 'Guilherme', avatar: null }
  const { logout } = useAuth()

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-sidebar border-subtle z-40 pl-64 pr-6 flex items-center justify-end shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{user.nome}</span>
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
          {user.nome[0]}
        </div>
        <button
          onClick={logout}
          className="text-danger hover:text-highlight transition-all text-xl"
          title="Sair"
        >
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  )
}
