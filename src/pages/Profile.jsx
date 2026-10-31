import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Heart, LogOut, MessageCircle, Send } from 'lucide-react'
import { get, post } from '../lib/api'
import { useLive } from '../lib/live'
import { useAuth } from '../lib/auth'
import { Avatar, Empty, ErrorState, Skeleton } from '../components/ui'
import { ago, fmtDate, fmtTime } from '../lib/fmt'

function useDiary(id) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { setData(await get(`/profiles/${id}/diary`)); setErr('') } catch (e) { setErr(e.message) }
  }, [id])
  useEffect(() => { setData(null); load() }, [load])
  useLive(['posts', 'likes', 'comments'], load)
  return { data, err, load }
}

export default function Profile() {
  const { id } = useParams()
  const { userId, signOut } = useAuth()
  const nav = useNavigate()
  const { data, err, load } = useDiary(id)
  if (err && !data) return <ErrorState message={err} onRetry={load} />
  if (!data) {
    return (
      <div className="px-5">
        <div className="flex items-center gap-4"><Skeleton className="h-20 w-20 !rounded-full" /><Skeleton className="h-12 flex-1" /></div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      </div>
    )
  }
  const { profile, posts } = data
  return (
    <div className="px-5">
      <div className="flex items-center gap-4">
        <Avatar p={profile} size={80} />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold leading-tight">{profile.display_name}</h1>
          {profile.bio && <p className="mt-0.5 text-[13px] text-muted">{profile.bio}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold">
          <b className="text-coral-ink">{posts.length}</b> {posts.length === 1 ? 'moment' : 'moments'}
        </span>
        {userId === id && (
          <button onClick={async () => { await signOut(); nav('/') }} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <LogOut size={14} />Sign out
          </button>
        )}
      </div>
      {posts.length === 0 ? (
        <Empty emoji="📸" title="No moments yet" body="Photos posted during a stop land here." />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.8, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 16 }}>
                <Link to={`/profile/${id}/post/${p.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-surface">
                  <img src={p.photo_url} alt={p.caption || p.node.title} loading="lazy" className="h-full w-full object-cover transition group-active:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                    <p className="truncate text-[13px] font-bold">{p.node.emoji} {p.node.title}</p>
                    <p className="flex items-center gap-2.5 text-[11px] text-cloud/80">
                      <span>{fmtTime(p.created_at)}</span>
                      <span className="flex items-center gap-0.5"><Heart size={11} />{p.like_count}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={11} />{p.comment_count}</span>
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export function PostDetail() {
  const { id, postId } = useParams()
  const { userId, profile: me } = useAuth()
  const nav = useNavigate()
  const { data, err, load } = useDiary(id)
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [burst, setBurst] = useState(0)

  const loadComments = useCallback(async () => {
    try { setComments(await get(`/posts/${postId}/comments`)) } catch { /* keep old */ }
  }, [postId])
  useEffect(() => { loadComments() }, [loadComments])
  useLive(['comments'], loadComments)

  if (err && !data) return <ErrorState message={err} onRetry={load} />
  const p = data?.posts.find((x) => x.id === postId)
  if (!data) return <div className="px-5"><Skeleton className="aspect-[4/5]" /></div>
  if (!p) return <ErrorState message="This moment is gone" />

  const like = async () => {
    setBurst((b) => b + 1)
    await post(`/posts/${p.id}/like`).catch(() => {})
    load()
  }
  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try { await post(`/posts/${p.id}/comments`, { body: text.trim() }); setText(''); loadComments(); load() }
    finally { setBusy(false) }
  }
  return (
    <div className="px-5">
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft size={16} />Diary</button>
      <div className="overflow-hidden rounded-[28px] bg-surface">
        <div className="relative" onDoubleClick={like}>
          <img src={p.photo_url} alt={p.caption || p.node.title} className="aspect-[4/5] w-full object-cover" />
          <AnimatePresence>
            {burst > 0 && (
              <motion.div key={burst} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.7 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-coral-ink"><Heart size={96} fill="currentColor" /></motion.div>
            )}
          </AnimatePresence>
          <div className="absolute left-3 top-3 rounded-full bg-ink/70 text-cloud px-3 py-1.5 text-xs font-bold backdrop-blur">
            {p.node.emoji} {p.node.title} · {fmtDate(p.created_at)}, {fmtTime(p.created_at)}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar p={p.author} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{p.author.display_name}</p>
              {p.node.venue && <p className="truncate text-xs text-muted">{p.node.venue}</p>}
            </div>
            <motion.button whileTap={{ scale: 0.8 }} onClick={like}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold ${p.liked_by_me ? 'bg-coral text-ink' : 'bg-surface-2'}`}>
              <Heart size={16} fill={p.liked_by_me ? 'currentColor' : 'none'} />{p.like_count}
            </motion.button>
          </div>
          {p.caption && <p className="mt-3 text-[15px]">{p.caption}</p>}
        </div>
      </div>

      <h2 className="mb-3 mt-6 font-display text-xl font-bold">Comments</h2>
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.li key={c.id} layout initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex gap-3">
              <Link to={`/profile/${c.author.id}`}><Avatar p={c.author} size={32} /></Link>
              <div className="rounded-2xl bg-surface px-3.5 py-2.5">
                <p className="text-xs text-muted"><b className="text-fg">{c.author.display_name}</b> · {ago(c.created_at)}</p>
                <p className="text-[15px]">{c.body}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {comments.length === 0 && <li className="text-sm text-muted">Be the first to say something.</li>}
      </ul>
      {userId && (
        <form onSubmit={send} className="sticky bottom-4 mt-5 flex gap-2 rounded-full bg-surface-2 p-1.5 shadow-2xl shadow-black/50">
          <Avatar p={me} size={40} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment"
            className="min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-muted" />
          <button disabled={!text.trim() || busy} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-ink disabled:opacity-40"><Send size={18} /></button>
        </form>
      )}
    </div>
  )
}
