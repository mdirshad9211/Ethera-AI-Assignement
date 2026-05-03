import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            Project Hub
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }
            >
              Projects
            </NavLink>
            {user?.platformAdmin ? (
              <NavLink
                to="/directory/users"
                className={({ isActive }) =>
                  isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }
              >
                Members
              </NavLink>
            ) : null}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{user?.name}</span>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-2 py-1 text-slate-300 hover:bg-slate-800"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
