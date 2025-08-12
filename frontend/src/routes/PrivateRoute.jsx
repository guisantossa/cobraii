// src/routes/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function PrivateRoute({ children }) {
  // evita erro quando o provider não está montado:
  const auth = typeof useAuth === 'function' ? useAuth() : undefined
  const isAuthenticated =
    auth?.isAuthenticated ?? !!localStorage.getItem('cobraii_token')

  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
