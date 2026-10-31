import express from 'express'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(express.json())

// Per-request client that forwards the caller's token so RLS applies.
const clientFor = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {} },
  })

const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()

// Returns the user for a valid bearer token, else null.
const userOf = async (req, sb) => {
  const token = tokenOf(req)
  if (!token) return null
  const { data, error } = await sb.auth.getUser(token)
  return error ? null : data.user
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message)
}
const check = ({ error }) => {
  if (error) fail(error.code === '23503' ? 400 : 500, error.code === '23503' ? 'Create your profile first' : error.message)
}
const need = async (req, sb) => (await userOf(req, sb)) || fail(401, 'Sign in required')
const str = (v, name) => (typeof v === 'string' && v.trim() ? v.trim() : fail(400, `${name} is required`))
const isoDate = (v, name) => (v && !Number.isNaN(Date.parse(v)) ? v : fail(400, `${name} must be a valid date`))

// Route wrapper: runs the handler with a client and turns throws into { error }.
const route = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, clientFor(req), res))
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error' })
  }
}

const uniq = (a) => [...new Set(a)]

async function profileMap(sb, ids) {
  ids = uniq(ids.filter(Boolean))
  if (!ids.length) return {}
  const { data, error } = await sb.from('profiles').select('id, display_name, avatar_url, bio').in('id', ids)
  check({ error })
  return Object.fromEntries(data.map((p) => [p.id, p]))
}

const photoUrl = (sb, path) =>
  /^http/i.test(path) ? path : sb.storage.from('posts').getPublicUrl(path).data.publicUrl

// Nodes include every day member (they are in all nodes) plus anyone who joined the node on its own.
async function buildNodes(sb, rows) {
  if (!rows.length) return []
  const nodeIds = rows.map((n) => n.id)
  const dayIds = uniq(rows.map((n) => n.day_id))
  const [nm, dm, posts] = await Promise.all([
    sb.from('node_members').select('node_id, user_id').in('node_id', nodeIds),
    sb.from('day_members').select('day_id, user_id').in('day_id', dayIds),
    sb.from('posts').select('node_id').in('node_id', nodeIds),
  ])
  check(nm)
  check(dm)
  check(posts)
  const profiles = await profileMap(sb, [...nm.data, ...dm.data].map((m) => m.user_id))
  return rows
    .map((n) => {
      const ids = uniq([
        ...nm.data.filter((m) => m.node_id === n.id).map((m) => m.user_id),
        ...dm.data.filter((m) => m.day_id === n.day_id).map((m) => m.user_id),
      ])
      return {
        id: n.id,
        day_id: n.day_id,
        title: n.title,
        venue: n.venue,
        emoji: n.emoji,
        starts_at: n.starts_at,
        ends_at: n.ends_at,
        members: ids.map((i) => profiles[i]).filter(Boolean),
        post_count: posts.data.filter((p) => p.node_id === n.id).length,
      }
    })
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
}

async function buildDay(sb, row) {
  const [members, nodes] = await Promise.all([
    sb.from('day_members').select('user_id').eq('day_id', row.id),
    sb.from('nodes').select('*').eq('day_id', row.id),
  ])
  check(members)
  check(nodes)
  const profiles = await profileMap(sb, [row.owner_id, ...members.data.map((m) => m.user_id)])
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    owner: profiles[row.owner_id],
    members: members.data.map((m) => profiles[m.user_id]).filter(Boolean),
    nodes: await buildNodes(sb, nodes.data),
  }
}

async function buildPosts(sb, rows, viewerId) {
  if (!rows.length) return []
  const postIds = rows.map((p) => p.id)
  const [nodes, likes, comments] = await Promise.all([
    sb.from('nodes').select('id, title, venue, emoji, starts_at, ends_at').in('id', uniq(rows.map((p) => p.node_id))),
    sb.from('likes').select('post_id, user_id').in('post_id', postIds),
    sb.from('comments').select('post_id').in('post_id', postIds),
  ])
  check(nodes)
  check(likes)
  check(comments)
  const profiles = await profileMap(sb, rows.map((p) => p.author_id))
  const nodeById = Object.fromEntries(nodes.data.map((n) => [n.id, n]))
  return rows.map((p) => ({
    id: p.id,
    node: nodeById[p.node_id],
    author: profiles[p.author_id],
    photo_url: photoUrl(sb, p.photo_path),
    caption: p.caption,
    created_at: p.created_at,
    like_count: likes.data.filter((l) => l.post_id === p.id).length,
    liked_by_me: !!viewerId && likes.data.some((l) => l.post_id === p.id && l.user_id === viewerId),
    comment_count: comments.data.filter((c) => c.post_id === p.id).length,
  }))
}

async function getProfile(sb, id) {
  const { data, error } = await sb.from('profiles').select('id, display_name, avatar_url, bio').eq('id', id).maybeSingle()
  check({ error })
  return data || fail(404, 'Profile not found')
}

async function getDay(sb, id) {
  const { data, error } = await sb.from('days').select('*').eq('id', id).maybeSingle()
  check({ error })
  return data ? buildDay(sb, data) : fail(404, 'Day not found')
}

async function getPost(sb, id, viewerId) {
  const { data, error } = await sb.from('posts').select('*').eq('id', id).maybeSingle()
  check({ error })
  if (!data) fail(404, 'Post not found')
  return (await buildPosts(sb, [data], viewerId))[0]
}

app.get('/api/health', async (req, res) => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return res.json({ ok: true, supabase: 'not configured' })
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
    res.json({ ok: true, supabase: r.ok ? 'connected' : `error ${r.status}` })
  } catch (e) {
    res.status(500).json({ ok: false, supabase: String(e) })
  }
})

app.put('/api/profiles/me', route(async (req, sb) => {
  const user = await need(req, sb)
  const b = req.body || {}
  const row = { id: user.id, display_name: str(b.display_name, 'display_name') }
  if (b.avatar_url !== undefined) row.avatar_url = b.avatar_url
  if (b.bio !== undefined) row.bio = b.bio
  const { data, error } = await sb.from('profiles').upsert(row).select('id, display_name, avatar_url, bio').single()
  check({ error })
  return data
}))

app.get('/api/profiles/:id', route((req, sb) => getProfile(sb, req.params.id)))

app.get('/api/profiles/:id/diary', route(async (req, sb) => {
  const viewer = await userOf(req, sb)
  const profile = await getProfile(sb, req.params.id)
  const { data, error } = await sb.from('posts').select('*').eq('author_id', profile.id).order('created_at', { ascending: false })
  check({ error })
  return { profile, posts: await buildPosts(sb, data, viewer?.id) }
}))

// Declared before /api/days/:id so "current" is not read as an id.
app.get('/api/days/current', route(async (req, sb) => {
  const user = await need(req, sb)
  const { data, error } = await sb.from('day_members').select('days(*)').eq('user_id', user.id)
  check({ error })
  const days = data.map((m) => m.days).filter(Boolean)
  days.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  return days.length ? buildDay(sb, days[0]) : fail(404, 'No day yet')
}))

app.get('/api/days/:id', route((req, sb) => getDay(sb, req.params.id)))

app.post('/api/days', route(async (req, sb) => {
  const user = await need(req, sb)
  const b = req.body || {}
  const row = { owner_id: user.id, title: str(b.title, 'title'), date: isoDate(b.date, 'date') }
  const day = await sb.from('days').insert(row).select().single()
  check(day)
  check(await sb.from('day_members').insert({ day_id: day.data.id, user_id: user.id }))
  return getDay(sb, day.data.id)
}))

app.post('/api/days/:id/join', route(async (req, sb) => {
  const user = await need(req, sb)
  const day = await sb.from('days').select('id').eq('id', req.params.id).maybeSingle()
  check(day)
  if (!day.data) fail(404, 'Day not found')
  check(await sb.from('day_members').upsert({ day_id: day.data.id, user_id: user.id }, { ignoreDuplicates: true }))
  const nodes = await sb.from('nodes').select('id').eq('day_id', day.data.id)
  check(nodes)
  if (nodes.data.length) {
    check(await sb.from('node_members').upsert(
      nodes.data.map((n) => ({ node_id: n.id, user_id: user.id })),
      { ignoreDuplicates: true },
    ))
  }
  return { ok: true }
}))

app.post('/api/days/:id/nodes', route(async (req, sb) => {
  const user = await need(req, sb)
  const b = req.body || {}
  const starts_at = isoDate(b.starts_at, 'starts_at')
  const ends_at = isoDate(b.ends_at, 'ends_at')
  if (Date.parse(ends_at) <= Date.parse(starts_at)) fail(400, 'ends_at must be after starts_at')
  const row = {
    day_id: req.params.id,
    owner_id: user.id,
    title: str(b.title, 'title'),
    venue: b.venue || null,
    emoji: b.emoji || null,
    starts_at,
    ends_at,
  }
  const node = await sb.from('nodes').insert(row).select().single()
  if (node.error?.code === '42501') fail(403, 'Join the day first')
  check(node)
  // RLS only lets a user add themselves; the other day members are included when the node is read.
  check(await sb.from('node_members').upsert({ node_id: node.data.id, user_id: user.id }, { ignoreDuplicates: true }))
  return (await buildNodes(sb, [node.data]))[0]
}))

app.post('/api/nodes/:id/join', route(async (req, sb) => {
  const user = await need(req, sb)
  const node = await sb.from('nodes').select('id').eq('id', req.params.id).maybeSingle()
  check(node)
  if (!node.data) fail(404, 'Node not found')
  check(await sb.from('node_members').upsert({ node_id: node.data.id, user_id: user.id }, { ignoreDuplicates: true }))
  return { ok: true }
}))

app.post('/api/posts', route(async (req, sb) => {
  const user = await need(req, sb)
  const b = req.body || {}
  const row = {
    node_id: str(b.node_id, 'node_id'),
    author_id: user.id,
    photo_path: str(b.photo_path, 'photo_path'),
    caption: b.caption || null,
  }
  const post = await sb.from('posts').insert(row).select().single()
  check(post)
  return (await buildPosts(sb, [post.data], user.id))[0]
}))

app.post('/api/posts/:id/like', route(async (req, sb) => {
  const user = await need(req, sb)
  const post = await sb.from('posts').select('id').eq('id', req.params.id).maybeSingle()
  check(post)
  if (!post.data) fail(404, 'Post not found')
  const mine = { post_id: post.data.id, user_id: user.id }
  const existing = await sb.from('likes').select('post_id').match(mine).maybeSingle()
  check(existing)
  const liked = !existing.data
  check(liked ? await sb.from('likes').insert(mine) : await sb.from('likes').delete().match(mine))
  const count = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.data.id)
  check(count)
  return { liked, like_count: count.count }
}))

app.get('/api/posts/:id/comments', route(async (req, sb) => {
  const { data, error } = await sb.from('comments').select('*').eq('post_id', req.params.id).order('created_at', { ascending: true })
  check({ error })
  const profiles = await profileMap(sb, data.map((c) => c.author_id))
  return data.map((c) => ({ id: c.id, post_id: c.post_id, author: profiles[c.author_id], body: c.body, created_at: c.created_at }))
}))

app.post('/api/posts/:id/comments', route(async (req, sb) => {
  const user = await need(req, sb)
  const row = { post_id: req.params.id, author_id: user.id, body: str((req.body || {}).body, 'body') }
  const c = await sb.from('comments').insert(row).select().single()
  check(c)
  const profiles = await profileMap(sb, [user.id])
  return { id: c.data.id, post_id: c.data.post_id, author: profiles[user.id], body: c.data.body, created_at: c.data.created_at }
}))

export default app
