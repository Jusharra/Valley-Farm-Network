import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { styles } from '../../lib/styles'

const ROLES = [
  { value: 'customer', label: 'Customer',   desc: 'Browse and buy from local farms' },
  { value: 'farmer',   label: 'Farmer',     desc: 'Sell products and manage your farm' },
  { value: 'driver',   label: 'Driver',     desc: 'Deliver orders for local farmers' },
]

const ROLE_HOME = { farmer: '/dashboard', driver: '/driver', customer: '/' }

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [role, setRole]           = useState('customer')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signUp(email, password, fullName, role)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(ROLE_HOME[role] ?? '/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-green-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
            Valley Farm Network
          </span>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-stone-200/50 p-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-6">Create an account</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      role === r.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-semibold text-stone-800 text-sm">{r.label}</div>
                    <div className="text-stone-400 text-xs mt-0.5 leading-tight">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={styles.input}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                placeholder="8+ characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${styles.buttonPrimary} w-full justify-center mt-2 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-stone-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="text-green-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-stone-500 text-sm hover:text-green-700 transition-colors">
            ← Back to marketplace
          </Link>
        </p>
      </div>
    </div>
  )
}
