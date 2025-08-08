import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')

    const formBody = new URLSearchParams()
    formBody.append('username', email)
    formBody.append('password', senha)

    try {
      const response = await api.post('/usuarios/login', formBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        transformRequest: [(data) => data]
      })

      const { access_token } = response.data
      login(access_token)
      navigate('/dashboard')
    } catch (err) {
      const mensagem = err.response?.data?.detail || 'Erro ao fazer login'
      setErro(mensagem)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        {erro && <div className="text-red-500 mb-2">{erro}</div>}
        <button type="submit" className="bg-purple-700 text-white w-full p-2 rounded hover:bg-purple-800">
          Entrar
        </button>
      </form>
    </div>
  )
}
