import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Search, UserPlus, X, Check } from 'lucide-react'
import { get, post } from '../lib/api'
import { Avatar, Empty, Skeleton } from '../components/ui'

function Section({ title, count, children }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 flex items-baseline gap-2 font-display text-xl font-extrabold">
        {title}
        {count != null && <span className="text-[13px] font-semibold text-muted">{count}</span>}
      </h2>
      {children}
    </section>
  )
}

function InlineError({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-sm text-muted">
      <span>{message}</span>
      <button onClick={onRetry} className="min-h-[44px] shrink-0 rounded-xl bg-surface-2 px-4 font-bold text-fg">Try again</button>
    </div>
  )
}

const SkeletonRows = ({ n = 3 }) => (
  <div className="space-y-3">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>
)

export default function Social() {
  const [friends, setFriends] = useState(null)
  const [friendsErr, setFriendsErr] = useState('')
  const [q, setQ] = useState('')
  const [people, setPeople] = useState(null)
  const [peopleErr, setPeopleErr] = useState('')
  const [adding, setAdding] = useState(null)
  const [addErr, setAddErr] = useState('')
  const reqId = useRef(0)

  const loadFriends = useCallback(async () => {
    try { setFriends(await get('/friends')); setFriendsErr('') } catch (e) { setFriendsErr(e.message) }
  }, [])

  const loadPeople = useCallback(async (query) => {
    const id = ++reqId.current
    try {
      const r = await get('/profiles?q=' + encodeURIComponent(query.trim()))
      if (id === reqId.current) { setPeople(r); setPeopleErr('') }
    } catch (e) {
      if (id === reqId.current) setPeopleErr(e.message)
    }
  }, [])

  useEffect(() => { loadFriends() }, [loadFriends])
  useEffect(() => {
    const t = setTimeout(() => loadPeople(q), q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, loadPeople])

  async function add(p) {
    setAdding(p.id)
    setAddErr('')
    try {
      await post('/friends/' + p.id)
      await Promise.all([loadFriends(), loadPeople(q)])
    } catch (e) {
      setAddErr(`Could not add ${p.display_name}: ${e.message}`)
    } finally {
      setAdding(null)
    }
  }

  const strangers = (people || []).filter((p) => !p.is_friend)

  return (
    <div className="px-5 pb-8">
      <h1 className="font-display text-3xl font-extrabold">Social</h1>
      <p className="mt-1 text-[13px] text-muted">Your people, and the people you could be hanging out with.</p>

      <Section title="Your friends" count={friends ? friends.length : null}>
        {friendsErr && !friends ? (
          <InlineError message={friendsErr} onRetry={loadFriends} />
        ) : !friends ? (
          <SkeletonRows />
        ) : friends.length === 0 ? (
          <Empty emoji="👋" title="No friends yet" body="Add someone below, or join a friend's day by QR code.">{null}</Empty>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {friends.map((f, i) => (
                <motion.li key={f.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}>
                  <Link to={`/profile/${f.id}`} state={{ from: 'social' }}
                    className="flex min-h-[72px] items-center gap-4 rounded-3xl bg-surface p-3.5 active:scale-[0.99]">
                    <Avatar p={f} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[17px] font-extrabold">{f.display_name}</p>
                      <p className="truncate text-[13px] text-muted">{f.bio || 'No bio yet'}</p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Section title="Add friends">
        <label className="relative block">
          <span className="sr-only">Search people by name</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search people by name"
            className="h-12 w-full rounded-2xl border border-surface-2 bg-surface pl-11 pr-12 text-[16px] text-fg outline-none placeholder:text-muted/60 focus:border-coral [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted">
              <X size={18} />
            </button>
          )}
        </label>

        {addErr && <p role="alert" className="mt-3 rounded-2xl bg-surface p-3 text-[13px] text-muted">{addErr}</p>}

        <div className="mt-4">
          {peopleErr && !people ? (
            <InlineError message={peopleErr} onRetry={() => loadPeople(q)} />
          ) : !people ? (
            <SkeletonRows />
          ) : strangers.length === 0 ? (
            <Empty emoji={q ? '🔍' : '🎉'} title={q ? 'No one found' : 'You know everyone'}
              body={q ? `Nobody new matches "${q.trim()}".` : 'Everyone here is already your friend.'}>{null}</Empty>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {strangers.map((p) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex min-h-[72px] items-center gap-4 rounded-3xl bg-surface p-3.5">
                    <Avatar p={p} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[17px] font-extrabold">{p.display_name}</p>
                      <p className="truncate text-[13px] text-muted">{p.bio || 'No bio yet'}</p>
                    </div>
                    <button onClick={() => add(p)} disabled={adding === p.id}
                      aria-label={`Add ${p.display_name} as a friend`}
                      className="inline-flex h-11 min-w-[76px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-coral to-amber px-4 text-[14px] font-bold text-ink disabled:opacity-60 active:scale-95">
                      {adding === p.id ? <Check size={16} /> : <UserPlus size={16} />}
                      {adding === p.id ? 'Adding' : 'Add'}
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </Section>
    </div>
  )
}
