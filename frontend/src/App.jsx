import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PlatformAdminRoute } from './components/PlatformAdminRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ChangePassword } from './pages/ChangePassword'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { ProjectDetail } from './pages/ProjectDetail'
import { DirectoryUsers } from './pages/DirectoryUsers'
import { Projects } from './pages/Projects'
import { Register } from './pages/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/account/password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/directory/users"
          element={
            <ProtectedRoute>
              <PlatformAdminRoute>
                <DirectoryUsers />
              </PlatformAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
