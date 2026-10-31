import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Users } from 'lucide-react'
import { Avatar } from './ui'
import Banner from './Banner'
import { CameraSheet, ClockSheet } from './Sheets'
import { useAuth } from '../lib/auth'
import { isJumped, nodeState, useClockNodes, useNow, windowOpen } from '../lib/clock'
import { fmtTime } from '../lib/fmt'

const CaptureCtx = createContext(null)
export const useCapture = () => useContext(CaptureCtx)

const postedKey = 'hp_posted'
const getPosted = () => { try { return JSON.parse(localStorage.getItem(postedKey) || '[]') } catch { return [] } }

export default function Layout() {
  const { profile, userId } = useAuth()
  const nav = useNavigate()
  const t = useNow()
  const nodes = useClockNodes()
  const [clockOpen, setClockOpen] = useState(false)
  const [target, setTarget] = useState(null)
  const [file, setFile] = useState(null)
  const [posted, setPosted] = useState(getPosted)
  const [dismissed, setDismissed] = useState([])
  const taps = useRef({ n: 0, t: 0 })
  const input = useRef(null)

  const tapLogo = (e) => {
    const x = taps.current
    x.n = Date.now() - x.t > 1500 ? 1 : x.n + 1
    x.t = Date.now()
    if (x.n >= 5) { x.n = 0; e.preventDefault(); setClockOpen(true) }
  }

  const capture = (node) => { setTarget(node); input.current?.click() }
  const live = nodes.find(
    (n) => windowOpen(n, t) && !posted.includes(n.id) && !dismissed.includes(n.id) &&
      (!userId || n.members.some((m) => m.id === userId)),
  )
  const ctx = useMemo(() => ({ capture, posted }), [posted])

  return (
    <CaptureCtx.Provider value={ctx}>
      <div className="mx-auto min-h-dvh w-full max-w-md pb-28">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-cloud/80 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
          <Link to="/" onClick={tapLogo} className="select-none font-display text-[26px] font-extrabold tracking-tight">
            happy<span className="bg-gradient-to-r from-coral to-amber bg-clip-text text-transparent">path</span>
          </Link>
          <div className="flex items-center gap-3">
            {isJumped() && (
              <button onClick={() => setClockOpen(true)} className="flex items-center gap-1 rounded-full bg-mint/30 px-2.5 py-1 text-xs font-bold text-mint-deep">
                <Clock3 size={13} />{fmtTime(t)}
              </button>
            )}
            {profile && (
              <Link to="/friends" aria-label="Friends" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-cloud">
                <Users size={18} />
              </Link>
            )}
            {profile && <Link to={`/profile/${profile.id}`}><Avatar p={profile} size={36} /></Link>}
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.main key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
      <Banner node={live} onPost={capture} onDismiss={() => setDismissed([...dismissed, live.id])} />
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; f && setFile(f) }} />
      <CameraSheet node={target} file={file} onClose={() => setFile(null)}
        onPosted={(p) => {
          const next = [...posted, target.id]
          localStorage.setItem(postedKey, JSON.stringify(next)); setPosted(next)
          setFile(null); nav(`/profile/${userId}`)
        }} />
      <ClockSheet open={clockOpen} onClose={() => setClockOpen(false)} nodes={nodes} />
    </CaptureCtx.Provider>
  )
}
