import { useState } from 'react'
import { User, Mail, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { styles } from '../lib/styles'

// ── Tiny status helpers ───────────────────────────────────────────────────────

function StatusMsg({ status, error, successMsg }) {
  if (status === 'error')   return <p className="text-sm text-red-600">{error}</p>
  if (status === 'success') return <p className="text-sm text-green-600">{successMsg}</p>
  return null
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { profile, session } = useAuth()

  // ── Profile (name + phone) ──
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone:     profile?.phone     ?? '',
  })
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileError,  setProfileError]  = useState(null)

  async function saveProfile(e) {
    e.preventDefault()
    setProfileStatus('saving')
    setProfileError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profileForm.full_name, phone: profileForm.phone || null })
      .eq('id', session.user.id)
    if (error) { setProfileStatus('error'); setProfileError(error.message) }
    else setProfileStatus('success')
  }

  // ── Email ──
  const [newEmail,     setNewEmail]     = useState('')
  const [emailStatus,  setEmailStatus]  = useState(null)
  const [emailError,   setEmailError]   = useState(null)

  async function saveEmail(e) {
    e.preventDefault()
    setEmailStatus('saving')
    setEmailError(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) { setEmailStatus('error'); setEmailError(error.message) }
    else { setEmailStatus('success'); setNewEmail('') }
  }

  // ── Password ──
  const [pwForm,     setPwForm]     = useState({ password: '', confirm: '' })
  const [pwStatus,   setPwStatus]   = useState(null)
  const [pwError,    setPwError]    = useState(null)

  async function savePassword(e) {
    e.preventDefault()
    setPwStatus('saving')
    setPwError(null)
    if (pwForm.password !== pwForm.confirm) {
      setPwStatus('error'); setPwError('Passwords do not match'); return
    }
    if (pwForm.password.length < 8) {
      setPwStatus('error'); setPwError('Password must be at least 8 characters'); return
    }
    const { error } = await supabase.auth.updateUser({ password: pwForm.password })
    if (error) { setPwStatus('error'); setPwError(error.message) }
    else { setPwStatus('success'); setPwForm({ password: '', confirm: '' }) }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Account Settings</h1>
        <p className="text-stone-500 mt-1">Update your profile, email address, and password.</p>
      </div>

      <div className="space-y-6 max-w-lg">

        {/* ── Profile ── */}
        <form onSubmit={saveProfile} className="bg-white border border-stone-200/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-stone-400" />
            <h2 className="font-semibold text-stone-800">Profile</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
              className={styles.input}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              className={styles.input}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <StatusMsg status={profileStatus} error={profileError} successMsg="Profile updated." />
          <button type="submit" disabled={profileStatus === 'saving'} className={`${styles.buttonPrimary} disabled:opacity-60 disabled:cursor-not-allowed`}>
            {profileStatus === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        {/* ── Email ── */}
        <form onSubmit={saveEmail} className="bg-white border border-stone-200/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-stone-400" />
            <h2 className="font-semibold text-stone-800">Email address</h2>
          </div>
          <p className="text-sm text-stone-500">
            Current: <span className="font-medium text-stone-700">{session?.user?.email}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">New email address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className={styles.input}
              placeholder="new@email.com"
            />
          </div>
          <StatusMsg
            status={emailStatus}
            error={emailError}
            successMsg="Verification email sent. Check your inbox to confirm the change."
          />
          <button
            type="submit"
            disabled={emailStatus === 'saving' || !newEmail}
            className={`${styles.buttonPrimary} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {emailStatus === 'saving' ? 'Sending…' : 'Update email'}
          </button>
        </form>

        {/* ── Password ── */}
        <form onSubmit={savePassword} className="bg-white border border-stone-200/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-stone-400" />
            <h2 className="font-semibold text-stone-800">Password</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">New password</label>
            <input
              type="password"
              required
              value={pwForm.password}
              onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
              className={styles.input}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Confirm new password</label>
            <input
              type="password"
              required
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className={styles.input}
            />
          </div>
          <StatusMsg status={pwStatus} error={pwError} successMsg="Password updated successfully." />
          <button
            type="submit"
            disabled={pwStatus === 'saving'}
            className={`${styles.buttonPrimary} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {pwStatus === 'saving' ? 'Updating…' : 'Change password'}
          </button>
        </form>

      </div>
    </div>
  )
}
