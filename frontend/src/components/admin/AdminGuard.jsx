// src/components/admin/AdminGuard.jsx
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { getUsuarioLogado } from '../../services/usuarios'

export default function AdminGuard({ children }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true); setErr('')
        const me = await getUsuarioLogado()
        if (!alive) return
        setAllowed(!!me?.is_admin) // se não vier, fica false
      } catch (e) {
        // 401/403 já são tratados pelo interceptor; aqui só marca como não permitido
        setAllowed(false)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-5">
          <div className="skeleton h-8 w-1/3 mb-3" />
          <div className="skeleton h-10 w-full mb-2" />
          <div className="skeleton h-10 w-full mb-2" />
          <div className="skeleton h-10 w-full" />
        </Card>
      </div>
    )
  }

  if (!allowed) return <Navigate to="/" replace />

  return children
}
