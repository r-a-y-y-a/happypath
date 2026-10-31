import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Camera, Heart, MapPin, MessageCircle } from 'lucide-react'
import { get, post } from '../lib/api'
import { useLive } from '../lib/live'
import { useAuth } from '../lib/auth'
import { nodeState, useNow } from '../lib/clock'
import { fmtRange, fmtTime } from '../lib/fmt'
import { Avatar, AvatarStack, Button, Empty, ErrorState, Skeleton } from '../components/ui'
import { useCapture } from '../components/Layout'
import { CHIP } from './Day'

function MomentCard({ p, linkState, onLike }) {
  const [burst, setBurst] = useState(0)
  const like = async () => {
    setBurst((b) => b + 1)
    await onLike(p)
  }
  return (
    <motion.li layout initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 18 }}
      className="overflow-hidden rounded-[28px] bg-surface shadow-md shadow-amber-900/10">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <Link to={`/profile/${p.author.id}`} state={linkState}><Avatar p={p.author} size={36} /></Link>
        <div className="min-w-0 flex-1">
          <Link to={`/profile/${p.author.id}`} state={linkState} className="block truncate text-sm font-bold">{p.author.display_name}</Link>
          <p className="text-xs text-muted">{fmtTime(p.created_at)}</p>
        </div>
      </div>
      <div className="relative" onDoubleClick={like}>
        <Link to={`/profile/${p.author.id}/post/${p.id}`} state={linkState} className="block">
          <img src={p.photo_url} alt={p.caption || p.node.title} loading="lazy" className="aspect-[4/5] w-full bg-surface-2 object-cover" />
        </Link>
        <AnimatePresence>
          {burst > 0 && (
            <motion.div key={burst} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.7 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-coral"><Heart size={96} fill="currentColor" /></motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="px-4 pb-4 pt-3">
        {p.caption && <p className="text-[15px] leading-snug"><b className="mr-1.5">{p.author.display_name}</b>{p.caption}</p>}
        <div className="mt-3 flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.85 }} onClick={like} aria-label={p.liked_by_me ? 'Unlike' : 'Like'}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold ${p.liked_by_me ? 'bg-coral text-ink' : 'bg-surface-2'}`}>
            <Heart size={16} fill={p.liked_by_me ? 'currentColor' : 'none'} />{p.like_count}
          </motion.button>
          <Link to={`/profile/${p.author.id}/post/${p.id}`} state={linkState} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-bold">
            <MessageCircle size={16} />{p.comment_count}
          </Link>
        </div>
      </div>
    </motion.li>
  )
}

export default function Activity() {
  const { id } = useParams()
  const { state: linkState } = useLocation()
  const { userId } = useAuth()
  const { capture, didPost } = useCapture()
  const t = useNow()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setData(await get(`/nodes/${id}`)); setErr('') } catch (e) { setErr(e.message) }
  }, [id])
  useEffect(() => { setData(null); load() }, [load])
  useLive(['posts', 'likes', 'comments'], load)

  // Update the heart straight away, then let the server count win.
  const like = async (p) => {
    setData((d) => ({ ...d, posts: d.posts.map((x) => (x.id === p.id ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) } : x)) }))
    await post(`/posts/${p.id}/like`).catch(() => {})
    load()
  }

  if (err && !data) return <ErrorState message={err} onRetry={load} />
  if (!data) {
    return (
      <div className="space-y-4 px-5">
        <Skeleton className="h-36" />
        <Skeleton className="aspect-[4/5]" />
      </div>
    )
  }
  const { node, day, posts } = data
  const st = nodeState(node, t)
  const open = st === 'live' || st === 'grace'
  const [label, cls] = CHIP[st]
  const isMember = node.members.some((m) => m.id === userId)
  return (
    <div className="px-5 pb-6">
      <Link to={`/day/${day.id}`} state={linkState} className="mb-3 flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft size={16} />{day.title}
      </Link>

      <div className={`rounded-[28px] p-5 ${open ? 'bg-gradient-to-br from-surface-2 to-surface ring-1 ring-coral/60' : 'bg-surface shadow-sm shadow-amber-900/10'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl leading-none">{node.emoji}</p>
            <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight">{node.title}</h1>
            <p className="mt-1 text-[13px] text-muted">
              {node.venue && <><MapPin size={13} className="-mt-0.5 mr-1 inline" />{node.venue} · </>}
              {fmtRange(node)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <AvatarStack people={node.members} size={30} max={5} />
          <span className="text-xs font-semibold text-muted">{posts.length} {posts.length === 1 ? 'moment' : 'moments'}</span>
        </div>
        {open && isMember && !didPost({ ...node, post_authors: posts.map((x) => x.author?.id) }) && (
          <Button onClick={() => capture(node)} className="mt-4 h-11 w-full"><Camera size={18} />Post your moment</Button>
        )}
      </div>

      {posts.length === 0 ? (
        <Empty emoji="📸" title="No moments yet" body={open ? 'Be the first to post a photo from here.' : 'Photos posted during this stop land here.'} />
      ) : (
        <ul className="mt-5 space-y-5">
          <AnimatePresence initial={false}>
            {posts.map((p) => <MomentCard key={p.id} p={p} linkState={linkState} onLike={like} />)}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
