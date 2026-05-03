import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { ready, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const path = location.pathname
  const requiresPwChange = user?.mustChangePassword === true

  if (requiresPwChange && path !== '/account/password') {
    return <Navigate to="/account/password" replace state={{ from: location }} />
  }

  if (!requiresPwChange && path === '/account/password') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
