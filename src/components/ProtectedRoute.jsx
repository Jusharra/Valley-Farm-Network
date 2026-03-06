import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_HOME = {
  admin:    '/admin',
  farmer:   '/dashboard',
  driver:   '/driver',
  customer: '/',
}

export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-green-50">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/signin" replace />

  // Wrong role — send them to their actual dashboard
  if (role && profile?.role !== role) {
    return <Navigate to={ROLE_HOME[profile?.role] ?? '/'} replace />
  }

  return children
}
