import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Plus, UserPlus } from 'lucide-react'
import { get, post } from '../lib/api'
import { useLive } from '../lib/live'
import { useAuth } from '../lib/auth'
import { nodeState, setClockNodes, syncClock, useNow } from '../lib/clock'
import { fmtDate, fmtRange, localDate } from '../lib/fmt'
import { AvatarStack, Button, Empty, ErrorState, Skeleton } from '../components/ui'
import { AddNodeSheet, InviteSheet } from '../components/Sheets'
import { useCapture } from '../components/Layout'

export function Home() {
  const nav = useNavigate()
  const [state, setState] = useState('loading')
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setState('loading')
    try { nav(`/day/${(await get('/days/current')).id}`, { replace: true }) }
    catch (e) { e.status === 404 ? setState('empty') : (setErr(e.message), setState('error')) }
  }, [nav])
  useEffect(() => { load() }, [load])
  if (state === 'error') return <ErrorState message={err} onRetry={load} />
  if (state === 'empty') {
    return (
      <Empty emoji="🗓️" title="No plans yet" body="Start today's day, then invite friends.">
        <Button className="mt-3" onClick={async () => {
          const d = await post('/days', { title: 'Today', date: localDate() })
          nav(`/day/${d.id}`)
        }}>Start today</Button>
      </Empty>
    )
  }
  return <TimelineSkeleton />
}

const TimelineSkeleton = () => (
  <div className="space-y-4 px-5">
    <Skeleton className="h-32" />
    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
  </div>
)

const CHIP = {
  live: ['Live now', 'bg-coral text-ink'],
  grace: ['Post window open', 'bg-amber text-ink'],
  upcoming: ['Up next', 'bg-surface-2 text-muted'],
  past: ['Done', 'bg-surface-2 text-muted'],
}

function NodeCard({ node, i, t, userId }) {
  const { capture, posted } = useCapture()
  const st = nodeState(node, t)
  const open = st === 'live' || st === 'grace'
  const isMember = node.members.some((m) => m.id === userId)
  const [label, cls] = CHIP[st]
  return (
    <motion.li layout initial={{ opacity: 0, x: -24, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: Math.min(i, 5) * 0.06, type: 'spring', damping: 20 }} className="relative pl-9">
      <span className={`absolute left-0 top-6 flex h-[26px] w-[26px] items-center justify-center rounded-full text-sm ring-4 ring-ink ${open ? 'bg-coral' : 'bg-surface-2'}`}>
        {open && <span className="absolute inset-0 animate-ping rounded-full bg-coral/60" />}
        <span className="relative text-[13px]">{node.emoji}</span>
      </span>
      <div className={`rounded-3xl p-4 ${open ? 'bg-gradient-to-br from-surface-2 to-surface ring-1 ring-coral/60' : 'bg-surface'} ${st === 'past' ? 'opacity-75' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-bold leading-tight">{node.title}</h3>
            <p className="mt-0.5 truncate text-[13px] text-muted">{node.venue ? `${node.venue} · ` : ''}{fmtRange(node)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack people={node.members} size={30} />
          <span className="text-xs font-semibold text-muted">
            {node.post_count} {node.post_count === 1 ? 'moment' : 'moments'}
          </span>
        </div>
        {open && isMember && !posted.includes(node.id) && (
          <Button onClick={() => capture(node)} className="mt-3 h-11 w-full"><Camera size={18} />Post your moment</Button>
        )}
      </div>
    </motion.li>
  )
}

export default function Day() {
  const { id } = useParams()
  const { userId } = useAuth()
  const t = useNow()
  const [day, setDay] = useState(null)
  const [err, setErr] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const load = useCallback(async () => {
    try { const d = await get(`/days/${id}`); setDay(d); setClockNodes(d.nodes); setErr('') }
    catch (e) { setErr(e.message) }
  }, [id])
  useEffect(() => { setDay(null); load(); return () => setClockNodes([]) }, [load])
  useEffect(() => syncClock(id), [id])
  useLive(['nodes', 'day_members', 'posts'], load)

  if (err && !day) return <ErrorState message={err} onRetry={load} />
  if (!day) return <TimelineSkeleton />
  return (
    <div className="px-5">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-coral/90 via-coral to-amber p-5 text-ink">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{fmtDate(day.date + 'T12:00:00')}</p>
        <h1 className="mt-1 font-display text-[30px] font-extrabold leading-tight">{day.title}</h1>
        <div className="mt-4 flex items-center justify-between">
          <AvatarStack people={day.members} size={34} max={5} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setInviteOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-bold text-cloud">
            <UserPlus size={16} />Invite friends
          </motion.button>
        </div>
      </div>

      {day.nodes.length === 0 ? (
        <Empty emoji="📍" title="No stops yet" body="Add your first stop to start the path." />
      ) : (
        <ol className="relative mt-6 space-y-4 before:absolute before:bottom-6 before:left-[12px] before:top-6 before:w-0.5 before:bg-surface-2">
          <AnimatePresence initial={false}>
            {day.nodes.map((n, i) => <NodeCard key={n.id} node={n} i={i} t={t} userId={userId} />)}
          </AnimatePresence>
        </ol>
      )}

      <div className="mt-6 flex justify-center pb-10">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAddOpen(true)} aria-label="Add a stop"
          className="flex h-12 items-center gap-2 rounded-full bg-cloud px-6 font-bold text-ink shadow-xl shadow-black/40">
          <Plus size={20} />Add a stop
        </motion.button>
      </div>
      <AddNodeSheet open={addOpen} onClose={() => setAddOpen(false)} day={day} onAdded={load} />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} day={day} />
    </div>
  )
}
