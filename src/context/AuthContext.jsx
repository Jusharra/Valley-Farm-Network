import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // Shared helper — always fetches fresh from DB
  async function fetchProfile(userId) {
    console.log('Fetching profile for user:', userId)
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      console.log('Profile fetch result:', { data, error, status })
      
      if (error) {
        console.error('Profile fetch error:', error)
        console.error('Error details:', { message: error.message, details: error.details, hint: error.hint })
      } else {
        console.log('Profile loaded:', data)
      }
      
      setProfile(data ?? null)
      return data
    } catch (err) {
      console.error('Profile fetch exception:', err)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    // onAuthStateChange fires immediately on mount with the current auth state —
    // no need for a separate getSession() call, which would cause a double fetch.
    console.log('Setting up auth state change listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('Auth state changed:', { 
          event: _event, 
          hasSession: !!newSession, 
          userId: newSession?.user?.id,
          userEmail: newSession?.user?.email,
          previousUserId: session?.user?.id 
        })
        setSession(newSession)
        if (newSession) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email, password) {
    console.log('Sign in attempt for:', email)
    const result = await supabase.auth.signInWithPassword({ email, password })
    console.log('Sign in result:', { error: result.error, hasData: !!result.data, hasUser: !!result.data?.user })

    // Let onAuthStateChange handle profile fetching to avoid duplicate calls
    // This prevents race conditions and hanging

    return result
  }

  async function signUp(email, password, fullName, role = 'customer') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored in auth.users.raw_user_meta_data — read by the handle_new_user trigger
        data: { full_name: fullName, role },
      },
    })

    // If email confirmation is disabled we get a session immediately.
    // In that case eagerly sync state and update the profile row.
    if (data.user && data.session && !error) {
      setSession(data.session)
      // The trigger may have already inserted with role=customer — overwrite with chosen role
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
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
