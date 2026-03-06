import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_HOME = {
  admin:    '/admin',
  farmer:   '/dashboard',
  driver:   '/driver',
  customer: '/',
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-green-50">
      <div className="text-stone-500">Loading...</div>
    </div>
  )
}

export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth()

  console.log('ProtectedRoute check:', { loading, hasSession: !!session, hasProfile: !!profile, profileRole: profile?.role, requiredRole: role })

  // Still initializing, or session exists but profile hasn't arrived yet
  // (brief window between navigate() and onAuthStateChange settling)
  if (loading || (session && !profile)) return <Spinner />

  if (!session) return <Navigate to="/signin" replace />

  // User is logged in but under the wrong role — send them to their actual dashboard
  if (role && profile?.role !== role) {
    console.log('Role mismatch, redirecting to:', ROLE_HOME[profile?.role])
    return <Navigate to={ROLE_HOME[profile?.role] ?? '/'} replace />
  }

  return children
}
