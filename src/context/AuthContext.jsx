import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const CACHE_KEY = 'vfn_profile'

function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)) } catch { return null }
}
function writeCache(profile) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile)) } catch {}
}
function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}

export function AuthProvider({ children }) {
  const [session, setSession]         = useState(null)
  // Seed from sessionStorage so ProtectedRoute never spins on page reload
  const [profile, setProfile]         = useState(() => readCache())
  const [loading, setLoading]         = useState(true)   // auth state known?
  const [profileLoading, setProfileLoading] = useState(false)

  // Fetch fresh profile from DB. Uses Promise.race for a reliable 5s timeout
  // (AbortController doesn't reliably cancel Supabase queries).
  async function fetchProfile(userId) {
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)),
      ])
      if (error) {
        console.error('Profile fetch error:', error.message)
        return null
      }
      setProfile(data)
      writeCache(data)
      return data
    } catch (err) {
      console.error('Profile fetch failed:', err.message)
      // Don't clear the cached profile on timeout — keep showing what we have
      return null
    }
  }

  useEffect(() => {
    let active = true
    let initializedUserId = null

    const sessionRace = Promise.race([
      supabase.auth.getSession(),
      new Promise(resolve =>
        setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 4000)
      ),
    ])
    sessionRace.then(({ data: { session: s }, timedOut }) => {
      if (!active) return
      if (timedOut) {
        setLoading(false)
        return
      }
      initializedUserId = s?.user?.id ?? null
      setSession(s)
      setLoading(false)
      if (s?.user?.id) {
        setProfileLoading(true)
        fetchProfile(s.user.id).finally(() => {
          if (active) setProfileLoading(false)
        })
      } else {
        // No session — clear any stale cached profile
        setProfile(null)
        clearCache()
      }
    }).catch(() => {
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!active) return

        const isSameUser = newSession?.user?.id === initializedUserId

        // INITIAL_SESSION: getSession() already handled this — just sync state.
        // TOKEN_REFRESHED: token rotated, profile unchanged — no need to re-fetch.
        if ((event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && isSameUser) {
          setSession(newSession)
          setLoading(false)
          return
        }

        initializedUserId = newSession?.user?.id ?? null
        setSession(newSession)
        setLoading(false)
        if (!newSession) {
          setProfile(null)
          clearCache()
          setProfileLoading(false)
        } else {
          setProfileLoading(true)
          await fetchProfile(newSession.user.id)
          if (active) setProfileLoading(false)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email, password) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    return result
  }

  async function signUp(email, password, fullName, role = 'customer') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (data.user && data.session && !error) {
      setSession(data.session)
      await supabase
        .from('profiles')
        .update({ role, full_name: fullName })
        .eq('id', data.user.id)
      await fetchProfile(data.user.id)
      setLoading(false)
    }

    return { data, error }
  }

  async function signOut() {
    clearCache()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
