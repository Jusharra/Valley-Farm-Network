import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { styles } from '../../lib/styles'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a password reset link.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-green-50 flex items-center justify-center px-4">
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
          <h1 className="text-2xl font-bold text-stone-800 mb-6">Reset Password</h1>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className={`${styles.buttonPrimary} w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-center text-stone-500 text-sm mt-6">
            Remember your password?{' '}
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
