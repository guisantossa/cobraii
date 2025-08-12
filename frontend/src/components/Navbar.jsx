import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { getUsuarioLogado } from '../services/usuarios';

export default function Navbar() {
  const { logout } = useAuth();
  const [usuario, setUsuario] = useState({ nome: '' });
  const [dataHora, setDataHora] = useState('');

  // Atualiza a data/hora a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const formatado = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setDataHora(formatado);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Busca dados do usuário
  useEffect(() => {
    getUsuarioLogado()
      .then(res => setUsuario(res))
      .catch(() => logout());
  }, [logout]);

  return (
    <nav className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      <h1 className="text-lg font-bold text-gray-800">Cobraii</h1>

      <div className="flex items-center space-x-6">
        <span className="text-sm text-gray-500">{dataHora}</span>

        <span className="text-gray-700 font-medium">{usuario.nome}</span>

        <button
          onClick={() => alert('Abrir configurações')}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-full hover:bg-red-50 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6 text-red-500" />
        </button>
      </div>
    </nav>
  );
}
