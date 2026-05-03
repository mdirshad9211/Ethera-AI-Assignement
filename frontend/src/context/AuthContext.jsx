import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, ApiError } from '../api/client'

const AuthContext = createContext(null)

function normalizeUser(u) {
  if (!u) return null
  return {
    ...u,
    mustChangePassword: u.mustChangePassword === true,
    platformAdmin: u.platformAdmin === true,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const data = await api('/api/auth/me')
    setUser(normalizeUser(data.user))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setReady(true)
      return
    }
    api('/api/auth/me')
      .then((data) => setUser(normalizeUser(data.user)))
      .catch(() => logout())
      .finally(() => setReady(true))
  }, [logout])

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('token', data.token)
    const nextUser = normalizeUser(data.user)
    setUser(nextUser)
    return nextUser
  }, [])

  const register = useCallback(async (payload) => {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    localStorage.setItem('token', data.token)
    const nextUser = normalizeUser(data.user)
    setUser(nextUser)
    return nextUser
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setUser(normalizeUser(data.user))
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshSession,
      changePassword,
    }),
    [user, ready, login, register, logout, refreshSession, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
