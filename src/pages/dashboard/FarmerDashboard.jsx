import { useAuth } from '../../context/AuthContext'

// Full farmer dashboard — coming in a future step
export default function FarmerDashboard() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Farmer Dashboard</h1>
        <p className="text-stone-500 mb-6">Welcome, {profile?.full_name ?? 'Farmer'}</p>
        <button
          onClick={signOut}
          className="text-stone-500 hover:text-red-600 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
