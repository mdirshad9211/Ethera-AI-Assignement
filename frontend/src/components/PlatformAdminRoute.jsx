import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PlatformAdminRoute({ children }) {
  const { ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user?.platformAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
