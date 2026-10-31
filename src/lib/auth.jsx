import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { MOCK, supabase } from './supabase'
import { mockSignIn, mockSignOut, mockUserId } from './mock'
import { get, put } from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (id) => {
    if (!id) { setProfile(null); return }
    try { setProfile(await get(`/profiles/${id}`)) } catch { setProfile(null) }
  }, [])

  useEffect(() => {
    if (MOCK) {
      const id = mockUserId()
      setUserId(id); loadProfile(id)
      return
    }
    if (!supabase) { setUserId(null); return }
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id || null
      setUserId(id); loadProfile(id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const id = s?.user?.id || null
      setUserId(id)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const demoLogin = async () => {
    if (!MOCK && !supabase) throw new Error('Supabase env vars are missing')
    if (MOCK) { mockSignIn('u-maya'); setUserId('u-maya'); await loadProfile('u-maya'); return }
    const { data, error } = await supabase.auth.signInWithPassword({ email: 'maya@happypath.demo', password: 'happypath-demo' })
    if (error) throw error
    setUserId(data.user.id); await loadProfile(data.user.id)
  }

  const guestLogin = async (name) => {
    if (!MOCK && !supabase) throw new Error('Supabase env vars are missing')
    let id
    if (MOCK) { id = 'u-guest-' + Math.random().toString(36).slice(2, 7); mockSignIn(id) }
    else {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      id = data.user.id
    }
    setUserId(id)
    setProfile(await put('/profiles/me', { display_name: name.trim() }))
  }

  const signOut = async () => {
    if (MOCK) mockSignOut(); else await supabase?.auth.signOut()
    setUserId(null); setProfile(null)
  }

  // Saves name and bio, then updates the shared profile so every screen reflects it at once.
  const saveProfile = async ({ display_name, bio }) => {
    const saved = await put('/profiles/me', { display_name: display_name.trim(), bio: bio.trim() })
    setProfile(saved)
    return saved
  }

  return (
    <Ctx.Provider value={{ userId, profile, demoLogin, guestLogin, signOut, saveProfile, loading: userId === undefined }}>
      {children}
    </Ctx.Provider>
  )
}
