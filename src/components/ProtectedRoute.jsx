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
  const { session, profile, loading, profileLoading } = useAuth()

  // Waiting for initial auth state
  if (loading) return <Spinner />

  // No session — send to sign in
  if (!session) return <Navigate to="/signin" replace />

  // Profile still loading AND we have nothing cached — wait for role info.
  // If we already have a profile (e.g. token refresh re-fetch), render immediately.
  if (profileLoading && !profile) return <Spinner />

  // Profile failed to load (timeout/error) — force re-auth
  if (!profile) return <Navigate to="/signin" replace />

  // Wrong role — redirect to their actual home
  if (role && profile.role !== role) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/'} replace />
  }

  return children
}
