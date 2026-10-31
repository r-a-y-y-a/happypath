import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../lib/auth'
import { MOCK } from '../lib/supabase'

const photos = ['brunch', 'climb-wall', 'sunset', 'kaya', 'ubin-bike', 'chickenrice']

export default function SignIn({ onDone, heading = 'Plan the day.', sub = 'Catch the moment.' }) {
  const { demoLogin, googleLogin } = useAuth()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const run = (k, fn) => async () => {
    setBusy(k); setErr('')
    try { await fn(); onDone?.() } catch (e) { setErr(e.message || 'Could not sign in') } finally { setBusy('') }
  }
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-6 pb-8 pt-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/60 dark:bg-coral/30 blur-[90px]" />
      <div className="pointer-events-none absolute -left-24 top-72 h-64 w-64 rounded-full bg-mint/40 dark:bg-mint/15 blur-[90px]" />
      <a href="https://github.com/r-a-y-y-a/happypath" target="_blank" rel="noopener noreferrer" aria-label="happypath on GitHub" title="View the code on GitHub"
        className="absolute left-5 top-[max(14px,env(safe-area-inset-top))] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-fg shadow-md transition active:scale-90">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
      </a>
      <ThemeToggle className="absolute right-5 top-[max(14px,env(safe-area-inset-top))] z-10 shadow-md" />
      <div className="relative grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <motion.img key={p} src={`/seed/thumb/${p}.jpg`} alt=""
            initial={{ opacity: 0, y: 24, rotate: i % 2 ? 3 : -3 }} animate={{ opacity: 1, y: i % 2 ? 14 : 0, rotate: i % 2 ? 2 : -2 }}
            transition={{ delay: i * 0.07, type: 'spring', damping: 16 }}
            className="aspect-[3/4] w-full rounded-2xl object-cover shadow-xl shadow-amber-900/25" />
        ))}
      </div>
      <div className="relative mt-12">
        <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-tight">
          {heading}<br />
          <span className="bg-gradient-to-r from-coral-ink to-amber-ink bg-clip-text text-transparent">{sub}</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted">Chain your day into stops. Snap one real photo at each. Share the diary.</p>
      </div>
      <div className="relative mt-auto space-y-3 pt-8">
        {!MOCK && (
          <button onClick={run('google', googleLogin)} disabled={!!busy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[15px] font-bold text-[#3c4043] shadow-md ring-1 ring-black/10 transition active:scale-[0.98] disabled:opacity-60">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            {busy === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </button>
        )}
        <Button onClick={run('demo', demoLogin)} disabled={!!busy} className="w-full">
          {busy === 'demo' ? 'Signing in...' : 'Demo login as Maya'}
        </Button>
        {err && <p className="text-center text-sm font-medium text-coral-ink">{err}</p>}
      </div>
    </div>
  )
}
