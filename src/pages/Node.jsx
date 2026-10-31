import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, Check, Clock, Heart, MessageCircle } from 'lucide-react'
import { get } from '../lib/api'
import { useLive } from '../lib/live'
import { useAuth } from '../lib/auth'
import { nodeState, useNow } from '../lib/clock'
import { ago, fmtDate, fmtRange } from '../lib/fmt'
import { Avatar, Button, Empty, ErrorState, Skeleton } from '../components/ui'
import { useCapture } from '../components/Layout'
import { CHIP } from './Day'

// One stop: everyone who is on it and every photo they shared there.
export default function Stop() {
  const { id } = useParams()
  const { userId } = useAuth()
  const { state } = useLocation()
  const { capture, posted } = useCapture()
  const t = useNow()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setData(await get(`/nodes/${id}`)); setErr('') } catch (e) { setErr(e.message) }
  }, [id])
  useEffect(() => { setData(null); load() }, [load])
  useLive(['posts', 'node_members', 'day_members'], load)

  if (err && !data) return <ErrorState message={err} onRetry={load} />
  if (!data) {
    return (
      <div className="space-y-4 px-5">
        <Skeleton className="h-36" />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-2.5">{[0, 1].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      </div>
    )
  }

  const { node, day, posts } = data
  const st = nodeState(node, t)
  const open = st === 'live' || st === 'grace'
  const [label, cls] = CHIP[st]
  const postedBy = new Set(posts.map((p) => p.author?.id))
  const isMember = node.members.some((m) => m.id === userId)
  const canPost = open && isMember && !posted.includes(node.id) && !postedBy.has(userId)

  return (
    <div className="px-5 pb-6">
      <Link to={`/day/${day.id}`} state={state} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
        <ArrowLeft size={16} />{day.title}
      </Link>

      <div className="mt-3 rounded-[28px] bg-surface p-5 shadow-sm shadow-amber-900/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[34px] leading-none">{node.emoji}</p>
            <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{node.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
              <Clock size={13} />{fmtDate(day.date + 'T12:00:00+08:00')} · {fmtRange(node)}
            </p>
            {node.venue && <p className="mt-0.5 text-[13px] text-muted">{node.venue}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>
        </div>
        {canPost && (
          <Button onClick={() => capture(node)} className="mt-4 h-11 w-full"><Camera size={18} />Post your moment</Button>
        )}
      </div>

      <section className="mt-6">
        <h2 className="font-display text-xl font-extrabold">Who is here <span className="text-muted">· {node.members.length}</span></h2>
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {node.members.map((m) => {
            const has = postedBy.has(m.id)
            return (
              <li key={m.id}>
                <Link to={`/profile/${m.id}`} state={state}
                  className={`flex items-center gap-3 rounded-2xl bg-surface p-3 active:scale-[0.98] ${has ? '' : 'opacity-70'}`}>
                  <Avatar p={m} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold">{m.id === userId ? 'You' : m.display_name}</span>
                    <span className={`flex items-center gap-1 text-[11px] font-semibold ${has ? 'text-mint-ink' : 'text-muted'}`}>
                      {has ? <><Check size={12} strokeWidth={3} />Posted</> : 'Not yet'}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-xl font-extrabold">Moments <span className="text-muted">· {posts.length}</span></h2>
        {posts.length === 0 ? (
          <Empty emoji="📸" title="No moments yet" body="Photos shared during this stop show up here." />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {posts.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
                <Link to={`/profile/${p.author.id}/post/${p.id}`} state={state}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-surface-2">
                  <img src={p.photo_url} alt={p.caption || `${p.author.display_name} at ${node.title}`} loading="lazy"
                    className="h-full w-full object-cover transition group-active:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-12 text-cloud">
                    <p className="flex items-center gap-2 text-[13px] font-bold">
                      <Avatar p={p.author} size={22} />
                      <span className="truncate">{p.author.id === userId ? 'You' : p.author.display_name}</span>
                    </p>
                    {p.caption && <p className="mt-1 line-clamp-2 text-[12px] leading-snug opacity-90">{p.caption}</p>}
                    <p className="mt-1 flex items-center gap-2.5 text-[11px] opacity-80">
                      <span>{ago(p.created_at, t)}</span>
                      <span className="flex items-center gap-0.5"><Heart size={11} />{p.like_count}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={11} />{p.comment_count}</span>
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
