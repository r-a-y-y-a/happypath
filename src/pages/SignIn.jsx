import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Field } from '../components/ui'
import { useAuth } from '../lib/auth'

const photos = ['1504754524776-8f4f37790ca0', '1507525428034-b723cf961d3e', '1522163182402-834f871fd851', '1414235077428-338989a2e8c0', '1495474472287-4d71bcdd2085', '1540189549336-e6e99c3679fe']

export default function SignIn({ onDone, heading = 'Plan the day.', sub = 'Catch the moment.' }) {
  const { demoLogin, guestLogin } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const run = (k, fn) => async () => {
    setBusy(k); setErr('')
    try { await fn(); onDone?.() } catch (e) { setErr(e.message || 'Could not sign in') } finally { setBusy('') }
  }
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-6 pb-8 pt-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/60 blur-[90px]" />
      <div className="pointer-events-none absolute -left-24 top-72 h-64 w-64 rounded-full bg-mint/40 blur-[90px]" />
      <div className="relative grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <motion.img key={p} src={`https://images.unsplash.com/photo-${p}?w=400&h=533&q=70&auto=format&fit=crop`} alt=""
            initial={{ opacity: 0, y: 24, rotate: i % 2 ? 3 : -3 }} animate={{ opacity: 1, y: i % 2 ? 14 : 0, rotate: i % 2 ? 2 : -2 }}
            transition={{ delay: i * 0.07, type: 'spring', damping: 16 }}
            className="aspect-[3/4] w-full rounded-2xl object-cover shadow-xl shadow-amber-900/25" />
        ))}
      </div>
      <div className="relative mt-12">
        <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-tight">
          {heading}<br />
          <span className="bg-gradient-to-r from-coral to-amber bg-clip-text text-transparent">{sub}</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted">Chain your day into stops. Snap one real photo at each. Share the diary.</p>
      </div>
      <div className="relative mt-auto space-y-3 pt-8">
        <Field label="Join as a guest" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={run('guest', () => guestLogin(name))} disabled={!name.trim() || !!busy} variant="mint" className="w-full">
          {busy === 'guest' ? 'Joining...' : 'Continue as guest'}
        </Button>
        <Button onClick={run('demo', demoLogin)} disabled={!!busy} className="w-full">
          {busy === 'demo' ? 'Signing in...' : 'Demo login as Maya'}
        </Button>
        {err && <p className="text-center text-sm font-medium text-coral">{err}</p>}
      </div>
    </div>
  )
}
