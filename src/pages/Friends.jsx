import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { get } from '../lib/api'
import { Avatar, Empty, ErrorState, Skeleton } from '../components/ui'
import { fmtDate } from '../lib/fmt'

export default function Friends() {
  const [friends, setFriends] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { setFriends(await get('/friends')); setErr('') } catch (e) { setErr(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  if (err && !friends) return <ErrorState message={err} onRetry={load} />
  if (!friends) return <div className="space-y-3 px-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  return (
    <div className="px-5">
      <h1 className="font-display text-3xl font-extrabold">Friends</h1>
      <p className="mt-1 text-[13px] text-muted">What your friends are up to. Tap one to see their days and diary.</p>
      {friends.length === 0 ? (
        <Empty emoji="👋" title="No friends yet" body="Join a friend's day by their link or QR code and you will be friends." />
      ) : (
        <ul className="mt-5 space-y-3">
          {friends.map((f, i) => (
            <motion.li key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
              <Link to={`/profile/${f.id}`} className="flex items-center gap-4 rounded-3xl bg-surface p-4 active:scale-[0.99]">
                <Avatar p={f} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-extrabold">{f.display_name}</p>
                  {f.latest_day ? (
                    <>
                      <p className="truncate text-[13px] text-muted">{f.latest_day.title} · {fmtDate(f.latest_day.date + 'T12:00:00+08:00')}</p>
                      <p className="mt-1 truncate text-lg tracking-wide">{f.latest_day.stops.map((s) => s.emoji).join(' ')}</p>
                    </>
                  ) : (
                    <p className="text-[13px] text-muted">No days yet</p>
                  )}
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
