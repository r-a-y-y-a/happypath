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
      <h1 className="font-display text-3xl font-extrabold">Feed</h1>
      <p className="mt-1 text-[13px] text-muted">What your friends are up to right now. Tap a day to see where they went and their photos.</p>
      {friends.length === 0 ? (
        <Empty emoji="👋" title="No friends yet" body="Join a friend's day by their link or QR code and you will be friends." />
      ) : (
        <ul className="mt-5 space-y-3">
          {friends.map((f, i) => (
            <motion.li key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
              <Link state={{ from: 'friends' }} to={f.latest_day ? `/day/${f.latest_day.id}` : `/profile/${f.id}`} className="block rounded-3xl bg-surface p-4 shadow-sm shadow-amber-900/10 active:scale-[0.99]">
                <div className="flex items-center gap-4">
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
                </div>
                {f.latest_day?.photos?.length > 0 && (
                  <>
                    <div className={`mt-3 grid gap-1.5 ${f.latest_day.photos.length === 1 ? 'grid-cols-1' : f.latest_day.photos.length === 2 ? 'grid-cols-2' : f.latest_day.photos.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                      {f.latest_day.photos.map((src) => (
                        <img key={src} src={src} alt="" loading="lazy" className={`w-full rounded-2xl bg-surface-2 object-cover ${f.latest_day.photos.length < 3 ? 'aspect-[4/3]' : 'aspect-square'}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted">
                      {f.latest_day.moment_count} {f.latest_day.moment_count === 1 ? 'moment' : 'moments'}
                    </p>
                  </>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
