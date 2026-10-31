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
    try { setProfile(await get(`/profiles/${id}`)); return } catch { /* no profile yet */ }
    // First Google sign-in: build the profile from the Google account.
    try {
      const { data } = await supabase.auth.getUser()
      const m = data?.user?.user_metadata || {}
      const name = (m.full_name || m.name || data?.user?.email?.split('@')[0] || '').trim().slice(0, 30)
      if (!name) { setProfile(null); return }
      const row = { display_name: name }
      if (m.avatar_url || m.picture) row.avatar_url = m.avatar_url || m.picture
      setProfile(await put('/profiles/me', row))
    } catch { setProfile(null) }
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
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      const id = s?.user?.id || null
      setUserId(id)
      if (e === 'SIGNED_IN' && id) setTimeout(() => loadProfile(id), 0)
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

  // Redirects to Google and back to this same page (so an invite link keeps its /join/<day> path).
  const googleLogin = async () => {
    if (MOCK || !supabase) throw new Error('Google sign-in needs Supabase')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
    if (error) throw error
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
    <Ctx.Provider value={{ userId, profile, demoLogin, guestLogin, googleLogin, signOut, saveProfile, loading: userId === undefined }}>
      {children}
    </Ctx.Provider>
  )
}
