// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../auth/AuthContext'
import { afterLoginRedirect } from '../utils/afterLoginRedirect'
export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const formBody = new URLSearchParams()
    formBody.append('username', email)
    formBody.append('password', senha)

    try {
      const { data } = await api.post('/usuarios/login', formBody.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(d) => d],
      })
      login(data.access_token)
      await afterLoginRedirect(navigate)
    } catch (err) {
      const mensagem = err.response?.data?.detail || 'Erro ao fazer login'
      setErro(mensagem)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[var(--primary,#5E2CA5)] to-[var(--secondary,#4CAF50)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Marca / Cabeçalho */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="bg-white/10 backdrop-blur w-10 h-10 rounded-xl grid place-items-center font-black text-white">
            C
          </div>
          <span className="text-white text-2xl font-extrabold tracking-tight">Cobraii</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2 text-center">
            <h1 className="text-xl font-bold text-slate-900">Acessar conta</h1>
            <p className="text-slate-500 mt-1 text-sm">Faça login para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="px-6 pb-6 pt-4 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-4 focus:ring-[var(--primary,#5E2CA5)]/20 focus:border-[var(--primary,#5E2CA5)] px-3 py-2.5"
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-4 focus:ring-[var(--primary,#5E2CA5)]/20 focus:border-[var(--primary,#5E2CA5)] px-3 py-2.5 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm hover:text-slate-700"
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                {erro}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--primary,#5E2CA5)] text-white font-medium py-2.5 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            {/* Auxiliares (opcionais) */}
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-slate-600 select-none">
                <input type="checkbox" className="rounded border-slate-300" />
                Lembrar de mim
              </label>
              <Link to="/recuperar-senha" className="text-[var(--primary,#5E2CA5)] hover:underline">
                Esqueci a senha
              </Link>
            </div>
          </form>
        </div>

        {/* Rodapé curto */}
        <p className="text-center text-white/80 text-xs mt-4">
          © {new Date().getFullYear()} Cobraii
        </p>
      </div>
    </div>
  )
}
