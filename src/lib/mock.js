import { mockEmit } from './live'
import { localDate } from './fmt'
import { now } from './clock'

// Hardcoded backend in the exact CONTRACTS.md shapes.
const img = (seed, w = 900, h = 1125) => `https://picsum.photos/seed/${seed}/${w}/${h}`
const P = (id, display_name, bio) => ({ id, display_name, bio, avatar_url: `https://i.pravatar.cc/200?u=${id}` })
const people = {
  maya: P('u-maya', 'Maya', 'Collecting small good moments, one node at a time.'),
  jun: P('u-jun', 'Jun', 'Climber, coffee snob, always late.'),
  priya: P('u-priya', 'Priya', 'Will follow any food rumour.'),
  daniel: P('u-daniel', 'Daniel', 'Photos of sunsets, mostly.'),
}
const profiles = Object.fromEntries(Object.values(people).map((p) => [p.id, p]))

const at = (h, m = 0, dayOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const mkNode = (id, day_id, title, venue, emoji, s, e, members) => ({
  id, day_id, title, venue, emoji, starts_at: s, ends_at: e, memberIds: members,
})
const all = ['u-maya', 'u-jun', 'u-priya', 'u-daniel']

const db = {
  days: [
    { id: 'day-today', title: 'Saturday in the city', date: localDate(), owner_id: 'u-maya', memberIds: [...all] },
    { id: 'day-1', title: 'Botanic Gardens picnic', date: localDate(new Date(Date.now() - 7 * 864e5)), owner_id: 'u-maya', memberIds: ['u-maya', 'u-priya'] },
    { id: 'day-2', title: 'Rainy day, big plans', date: localDate(new Date(Date.now() - 14 * 864e5)), owner_id: 'u-maya', memberIds: ['u-maya', 'u-jun'] },
    { id: 'day-3', title: 'Sentosa weekend', date: localDate(new Date(Date.now() - 21 * 864e5)), owner_id: 'u-maya', memberIds: all },
  ],
  nodes: [
    mkNode('n-brunch', 'day-today', 'Brunch', 'Common Man', '🥐', at(10), at(11, 30), all),
    mkNode('n-climb', 'day-today', 'Climb session', 'Boulder Planet', '🧗', at(13), at(15), ['u-maya', 'u-jun', 'u-priya']),
    mkNode('n-dinner', 'day-today', 'Dinner', 'Lau Pa Sat', '🍢', at(20), at(21, 30), all),
    mkNode('n-p1', 'day-1', 'Picnic', 'Botanic Gardens', '🧺', at(12, 0, -7), at(14, 0, -7), ['u-maya', 'u-priya']),
    mkNode('n-p2', 'day-2', 'Museum hop', 'National Gallery', '🖼️', at(14, 0, -14), at(16, 0, -14), ['u-maya', 'u-jun']),
    mkNode('n-p3', 'day-3', 'Beach golden hour', 'Siloso Beach', '🌅', at(18, 0, -21), at(19, 30, -21), all),
    mkNode('n-p4', 'day-3', 'Night market', 'Haji Lane', '🌙', at(20, 0, -21), at(22, 0, -21), all),
  ],
  posts: [
    { id: 'p-brunch-jun', node_id: 'n-brunch', author_id: 'u-jun', photo_path: img('brunch1'), caption: 'Eggs benny, no regrets', created_at: at(10, 22) },
    { id: 'p-brunch-pri', node_id: 'n-brunch', author_id: 'u-priya', photo_path: img('brunch2'), caption: 'Flat white art', created_at: at(10, 40) },
    { id: 'p-climb-jun', node_id: 'n-climb', author_id: 'u-jun', photo_path: img('climb1'), caption: 'Sent the purple one', created_at: at(13, 50) },
    { id: 'p-d1', node_id: 'n-p1', author_id: 'u-maya', photo_path: img('picnic1'), caption: 'Cheese, grapes, grass', created_at: at(12, 30, -7) },
    { id: 'p-d2', node_id: 'n-p2', author_id: 'u-maya', photo_path: img('gallery1'), caption: 'Staring at a very big painting', created_at: at(14, 40, -14) },
    { id: 'p-d3', node_id: 'n-p2', author_id: 'u-maya', photo_path: img('gallery2'), caption: 'Rain outside, art inside', created_at: at(15, 20, -14) },
    { id: 'p-d4', node_id: 'n-p3', author_id: 'u-maya', photo_path: img('beach1'), caption: 'Sky said show off', created_at: at(18, 40, -21) },
    { id: 'p-d5', node_id: 'n-p3', author_id: 'u-maya', photo_path: img('beach2'), caption: 'Toes in', created_at: at(19, 5, -21) },
    { id: 'p-d6', node_id: 'n-p4', author_id: 'u-maya', photo_path: img('market1'), caption: 'Satay count: lost track', created_at: at(20, 50, -21) },
  ],
  likes: {
    'p-brunch-jun': ['u-maya', 'u-priya'], 'p-brunch-pri': ['u-jun'], 'p-climb-jun': ['u-maya'],
    'p-d1': ['u-priya', 'u-jun', 'u-daniel'], 'p-d2': ['u-jun', 'u-priya', 'u-daniel', 'x1', 'x2'],
    'p-d3': ['u-jun', 'x1', 'x2', 'x3'], 'p-d4': ['u-jun', 'u-priya', 'u-daniel', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9'],
    'p-d5': ['u-jun', 'u-priya', 'x1', 'x2', 'x3'], 'p-d6': ['u-daniel', 'u-priya', 'x1', 'x2', 'x3', 'x4', 'x5'],
  },
  comments: [
    { id: 'c1', post_id: 'p-d4', author_id: 'u-daniel', body: 'That colour. Unreal.', created_at: at(19, 0, -21) },
    { id: 'c2', post_id: 'p-d4', author_id: 'u-priya', body: 'Ok I am jealous', created_at: at(19, 30, -21) },
    { id: 'c3', post_id: 'p-d1', author_id: 'u-priya', body: 'The brie was elite', created_at: at(13, 0, -7) },
    { id: 'c4', post_id: 'p-d2', author_id: 'u-jun', body: 'You stood there for 20 min', created_at: at(15, 0, -14) },
    { id: 'c5', post_id: 'p-d6', author_id: 'u-daniel', body: 'Save me one', created_at: at(21, 0, -21) },
  ],
}

let me = localStorage.getItem('hp_mock_user') || null
export const mockSignIn = (id) => { me = id; localStorage.setItem('hp_mock_user', id) }
export const mockSignOut = () => { me = null; localStorage.removeItem('hp_mock_user') }
export const mockUserId = () => me

const err = (status, message) => Object.assign(new Error(message), { status })
const prof = (id) => profiles[id] || { id, display_name: 'Guest', avatar_url: null, bio: null }
const nodeOut = (n) => ({
  id: n.id, day_id: n.day_id, title: n.title, venue: n.venue, emoji: n.emoji,
  starts_at: n.starts_at, ends_at: n.ends_at,
  members: n.memberIds.map(prof),
  post_count: db.posts.filter((p) => p.node_id === n.id).length,
})
const dayOut = (d) => ({
  id: d.id, title: d.title, date: d.date, owner: prof(d.owner_id),
  members: d.memberIds.map(prof),
  nodes: db.nodes.filter((n) => n.day_id === d.id).map(nodeOut).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
})
const postOut = (p) => {
  const n = db.nodes.find((x) => x.id === p.node_id)
  const likes = db.likes[p.id] || []
  return {
    id: p.id,
    node: { id: n.id, title: n.title, venue: n.venue, emoji: n.emoji, starts_at: n.starts_at, ends_at: n.ends_at },
    author: prof(p.author_id), photo_url: p.photo_path, caption: p.caption, created_at: p.created_at,
    like_count: likes.length, liked_by_me: !!me && likes.includes(me),
    comment_count: db.comments.filter((c) => c.post_id === p.id).length,
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function mockRequest(method, path, body) {
  await sleep(180)
  let m
  const key = `${method} ${path}`
  const need = () => { if (!me) throw err(401, 'Sign in first') }

  if (key === 'GET /health') return { ok: true, supabase: 'mock' }
  if (key === 'PUT /profiles/me') {
    need()
    profiles[me] = { ...(profiles[me] || {}), id: me, avatar_url: null, bio: null, ...body }
    mockEmit('profiles')
    return profiles[me]
  }
  if ((m = path.match(/^\/profiles\/([^/]+)\/diary$/)) && method === 'GET') {
    if (!profiles[m[1]]) throw err(404, 'Profile not found')
    const posts = db.posts.filter((p) => p.author_id === m[1]).map(postOut)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { profile: prof(m[1]), posts }
  }
  if ((m = path.match(/^\/profiles\/([^/]+)$/)) && method === 'GET') {
    if (!profiles[m[1]]) throw err(404, 'Profile not found')
    return profiles[m[1]]
  }
  if (key === 'GET /days/current') {
    need()
    const d = db.days.find((x) => x.memberIds.includes(me) && x.id === 'day-today') ||
      [...db.days].reverse().find((x) => x.memberIds.includes(me))
    if (!d) throw err(404, 'No day yet')
    return dayOut(d)
  }
  if ((m = path.match(/^\/days\/([^/]+)$/)) && method === 'GET') {
    const d = db.days.find((x) => x.id === m[1])
    if (!d) throw err(404, 'Day not found')
    return dayOut(d)
  }
  if (key === 'POST /days') {
    need()
    const d = { id: 'day-' + Date.now(), title: body.title, date: body.date, owner_id: me, memberIds: [me] }
    db.days.unshift(d)
    return dayOut(d)
  }
  if ((m = path.match(/^\/days\/([^/]+)\/join$/))) {
    need()
    const d = db.days.find((x) => x.id === m[1])
    if (!d) throw err(404, 'Day not found')
    if (!d.memberIds.includes(me)) d.memberIds.push(me)
    db.nodes.filter((n) => n.day_id === d.id).forEach((n) => !n.memberIds.includes(me) && n.memberIds.push(me))
    mockEmit('day_members'); mockEmit('nodes')
    return { ok: true }
  }
  if ((m = path.match(/^\/days\/([^/]+)\/nodes$/)) && method === 'POST') {
    need()
    const d = db.days.find((x) => x.id === m[1])
    if (!d) throw err(404, 'Day not found')
    if (!body.title || !body.starts_at || !body.ends_at) throw err(400, 'Title and times are required')
    const n = mkNode('n-' + Date.now(), d.id, body.title, body.venue || '', body.emoji || '📍', body.starts_at, body.ends_at, [...d.memberIds])
    db.nodes.push(n)
    mockEmit('nodes')
    return nodeOut(n)
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/join$/))) {
    need()
    const n = db.nodes.find((x) => x.id === m[1])
    if (n && !n.memberIds.includes(me)) n.memberIds.push(me)
    return { ok: true }
  }
  if (key === 'POST /posts') {
    need()
    const p = { id: 'p-' + Date.now(), node_id: body.node_id, author_id: me, photo_path: body.photo_path, caption: body.caption || '', created_at: new Date(now()).toISOString() }
    db.posts.push(p)
    mockEmit('posts'); mockEmit('nodes')
    return postOut(p)
  }
  if ((m = path.match(/^\/posts\/([^/]+)\/like$/))) {
    need()
    const l = (db.likes[m[1]] ||= [])
    const i = l.indexOf(me)
    i >= 0 ? l.splice(i, 1) : l.push(me)
    mockEmit('likes')
    return { liked: i < 0, like_count: l.length }
  }
  if ((m = path.match(/^\/posts\/([^/]+)\/comments$/))) {
    if (method === 'GET') {
      return db.comments.filter((c) => c.post_id === m[1]).map((c) => ({ ...c, author: prof(c.author_id) }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    }
    need()
    if (!body.body?.trim()) throw err(400, 'Comment is empty')
    const c = { id: 'c-' + Date.now(), post_id: m[1], author_id: me, body: body.body.trim(), created_at: new Date(now()).toISOString() }
    db.comments.push(c)
    mockEmit('comments')
    return { ...c, author: prof(me) }
  }
  throw err(404, 'Not found: ' + key)
}
