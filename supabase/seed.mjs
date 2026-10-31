// Seeds the demo data. Also the reset-demo script: re-running wipes the four demo users' rows and recreates them.
// Run with: npm run seed
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PASSWORD = 'happypath-demo'
const TZ = 'Asia/Singapore'
const img = (id) => `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`

const PEOPLE = {
  maya: { name: 'Maya', email: 'maya@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=47', bio: 'Brunch first, plans second. Collecting golden hours around the city.' },
  jun: { name: 'Jun', email: 'jun@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=12', bio: 'Boulderer, coffee snob, always 5 minutes late.' },
  priya: { name: 'Priya', email: 'priya@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=5', bio: 'Designer by day, hawker centre hunter by night.' },
  daniel: { name: 'Daniel', email: 'daniel@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=33', bio: 'Runs on kopi and sunsets.' },
}

const PHOTOS = {
  brunch: img('1504754524776-8f4f37790ca0'),
  brunchJun: img('1551632436-cbf8dd35adfa'),
  climb: img('1522163182402-834f871fd851'),
  coffee: img('1495474472287-4d71bcdd2085'),
  run: img('1476480862126-209bfaa8edc8'),
  beach: img('1507525428034-b723cf961d3e'),
  dinner: img('1414235077428-338989a2e8c0'),
  hike: img('1506905925346-21bda4d32df4'),
  ramen: img('1540189549336-e6e99c3679fe'),
  climbJun: img('1534438327276-14e5300c3a48'),
  bike: img('1485965120184-e220f721d03e'),
  ubinLunch: img('1504674900247-0877df9cc836'),
  pancakes: img('1567620905732-2d1ec7ab7445'),
  hawker: img('1555396273-367ea4eb4db5'),
  sunset: img('1472214103451-9374bd1c798e'),
  shore: img('1500375592092-40eb2168fd21'),
}

const must = ({ data, error }, what) => {
  if (error) {
    const hint = /relation|schema cache|does not exist/i.test(error.message) ? ' (is supabase/schema.sql applied?)' : ''
    throw new Error(`${what}: ${error.message}${hint}`)
  }
  return data
}

// Today's date in Singapore, shifted by n days.
const sgDate = (shift = 0) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + shift)
  return d.toISOString().slice(0, 10)
}
const at = (date, hhmm) => new Date(`${date}T${hhmm}:00+08:00`).toISOString()
// Post and comment times are never in the future, so a post created live during the demo always sorts above the seeded ones.
const postAt = (date, hhmm) => new Date(Math.min(new Date(`${date}T${hhmm}:00+08:00`).getTime(), Date.now() - 60000)).toISOString()

async function checkUrls() {
  const urls = [...Object.values(PHOTOS), ...Object.values(PEOPLE).map((p) => p.avatar)]
  const bad = []
  await Promise.all(urls.map(async (u) => {
    const r = await fetch(u, { method: 'GET' }).catch(() => null)
    if (!r || !r.ok || !r.headers.get('content-type')?.startsWith('image/')) bad.push(u)
  }))
  if (bad.length) throw new Error(`Image URLs failing:\n${bad.join('\n')}`)
}

async function ensureUsers() {
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`listUsers: ${error.message}`)
  const ids = {}
  for (const [key, p] of Object.entries(PEOPLE)) {
    const existing = data.users.find((u) => u.email === p.email)
    if (existing) {
      must(await sb.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true }), `update ${key}`)
      ids[key] = existing.id
    } else {
      const res = must(await sb.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: p.name } }), `create ${key}`)
      ids[key] = res.user.id
    }
  }
  return ids
}

async function wipe(ids) {
  const list = Object.values(ids)
  // Days cascade to nodes, node_members, day_members, and everyone's posts, likes and comments on them.
  must(await sb.from('days').delete().in('owner_id', list), 'wipe days')
  must(await sb.from('nodes').delete().in('owner_id', list), 'wipe nodes')
  must(await sb.from('comments').delete().in('author_id', list), 'wipe comments')
  must(await sb.from('likes').delete().in('user_id', list), 'wipe likes')
  must(await sb.from('posts').delete().in('author_id', list), 'wipe posts')
  must(await sb.from('node_members').delete().in('user_id', list), 'wipe node_members')
  must(await sb.from('day_members').delete().in('user_id', list), 'wipe day_members')
}

const insert = async (table, rows) => must(await sb.from(table).insert(rows).select(), `insert ${table}`)

// Friendships are optional until supabase/friends.sql has been run, so a missing table only warns.
async function seedFriends({ maya, jun, priya, daniel }) {
  // A small group: Maya is friends with exactly three people.
  const pairs = [[maya, jun], [maya, priya], [maya, daniel]]
  const list = [maya, jun, priya, daniel]
  const rows = pairs.flatMap(([a, b]) => [{ user_id: a, friend_id: b }, { user_id: b, friend_id: a }])
  const gone = await sb.from('friendships').delete().in('user_id', list)
  if (gone.error) return console.warn('Skipping friendships (run supabase/friends.sql first):', gone.error.message)
  must(await sb.from('friendships').delete().in('friend_id', list), 'wipe friendships')
  must(await sb.from('friendships').insert(rows), 'insert friendships')
}

async function main() {
  await checkUrls()
  const ids = await ensureUsers()
  const { maya, jun, priya, daniel } = ids

  must(await sb.from('profiles').upsert(
    Object.entries(PEOPLE).map(([k, p]) => ({ id: ids[k], display_name: p.name, avatar_url: p.avatar, bio: p.bio })),
  ), 'upsert profiles')
  await wipe(ids)

  // Day members are on every stop of a day, so a stop shared with only one friend uses `with` (stop-level members)
  // on a day that only the owner belongs to. Maya shares stops with Jun alone. Priya and Daniel have their own trips.
  const seedDay = async ({ owner, shift, title, members = [], nodes }) => {
    const date = sgDate(shift)
    const [day] = await insert('days', { owner_id: owner, title, date })
    await insert('day_members', [owner, ...members].map((user_id) => ({ day_id: day.id, user_id })))
    for (const n of nodes) {
      const [node] = await insert('nodes', { day_id: day.id, owner_id: owner, title: n.title, venue: n.venue, emoji: n.emoji, starts_at: at(date, n.from), ends_at: at(date, n.to) })
      await insert('node_members', [...new Set([owner, ...members, ...(n.with || [])])].map((user_id) => ({ node_id: node.id, user_id })))
      if (!n.photo) continue
      const [post] = await insert('posts', { node_id: node.id, author_id: n.who, photo_path: n.photo, caption: n.caption, created_at: postAt(date, n.at) })
      await insert('likes', n.likes.map((user_id) => ({ post_id: post.id, user_id })))
      await insert('comments', n.comments.map(([author_id, body], i) => ({ post_id: post.id, author_id, body, created_at: postAt(date, n.at.replace(/:\d\d$/, `:${String(10 + i * 7).padStart(2, '0')}`)) })))
    }
    return { day, date }
  }

  // Maya's past days. Jun joins only the stops marked `with`.
  await seedDay({ owner: maya, shift: -2, title: 'Slow Sunday', nodes: [
    { title: 'Coffee at Tiong Bahru Bakery', venue: 'Tiong Bahru Bakery', emoji: '☕', from: '09:00', to: '10:30', with: [jun], photo: PHOTOS.coffee, caption: 'Flat white and a kouign-amann. Sunday sorted.', at: '09:40', who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Save me a bite next time!'], [priya, 'That pastry 😍']] },
    { title: 'Run at East Coast Park', venue: 'East Coast Park', emoji: '🏃', from: '17:00', to: '18:30', photo: PHOTOS.run, caption: '10k done, legs gone.', at: '17:50', who: maya, likes: [jun, daniel, priya], comments: [[daniel, 'Pace?? Respect.']] },
  ] })
  await seedDay({ owner: maya, shift: -5, title: 'Beach day', nodes: [
    { title: 'Sentosa beach hangout', venue: 'Palawan Beach', emoji: '🏖️', from: '11:00', to: '14:00', photo: PHOTOS.beach, caption: 'Pretending this is a holiday.', at: '12:15', who: maya, likes: [jun, priya, daniel], comments: [[priya, 'Take me back'], [daniel, 'Best day of the month']] },
    { title: 'Dinner at Newton', venue: 'Newton Food Centre', emoji: '🍢', from: '19:00', to: '21:00', photo: PHOTOS.dinner, caption: 'Sambal stingray, no regrets.', at: '19:45', who: maya, likes: [jun, priya], comments: [[priya, 'The stingray!!']] },
  ] })
  await seedDay({ owner: maya, shift: -9, title: 'Hike and ramen', nodes: [
    { title: 'MacRitchie treetop walk', venue: 'MacRitchie Reservoir', emoji: '🥾', from: '07:30', to: '10:00', with: [jun], photo: PHOTOS.hike, caption: 'Up before the sun for this.', at: '08:20', who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Worth the 6am alarm'], [priya, 'Gorgeous light']] },
    { title: 'Ramen night', venue: 'Ippudo Tanjong Pagar', emoji: '🍜', from: '19:30', to: '21:00', photo: PHOTOS.ramen, caption: 'Extra noodles, always.', at: '20:05', who: maya, likes: [jun, priya, daniel], comments: [[daniel, 'Kae-dama gang']] },
  ] })

  // Each friend's own trips, none shared with Maya.
  await seedDay({ owner: jun, shift: -1, title: 'Pulau Ubin ride', nodes: [
    { title: 'Bike the Ubin trails', venue: 'Pulau Ubin', emoji: '🚲', from: '09:00', to: '11:30', photo: PHOTOS.bike, caption: 'Mud, mangroves and zero signal.', at: '10:15', who: jun, likes: [maya, daniel], comments: [[maya, 'Next time I am coming with you'], [daniel, 'Your chain fell off twice 😂']] },
    { title: 'Seafood lunch at Ubin', venue: 'Ubin Town', emoji: '🦀', from: '12:00', to: '13:30', photo: PHOTOS.ubinLunch, caption: 'Earned every bite.', at: '12:40', who: jun, likes: [maya, priya], comments: [[priya, 'Chilli crab??']] },
  ] })
  await seedDay({ owner: priya, shift: -3, title: 'Hawker crawl', nodes: [
    { title: 'Breakfast at Tiong Bahru Market', venue: 'Tiong Bahru Market', emoji: '🥞', from: '08:00', to: '09:30', photo: PHOTOS.pancakes, caption: 'Kaya toast, then a second breakfast.', at: '08:35', who: priya, likes: [maya, jun, daniel], comments: [[maya, 'The queue was worth it?']] },
    { title: 'Lunch at Maxwell', venue: 'Maxwell Food Centre', emoji: '🍜', from: '12:00', to: '13:30', photo: PHOTOS.hawker, caption: 'Chicken rice, obviously.', at: '12:30', who: priya, likes: [maya, daniel], comments: [[daniel, 'Tian Tian or not?']] },
  ] })
  await seedDay({ owner: daniel, shift: -6, title: 'Sunset by the sea', nodes: [
    { title: 'Sunset at Marina Barrage', venue: 'Marina Barrage', emoji: '🌅', from: '18:00', to: '19:30', photo: PHOTOS.sunset, caption: 'Chasing the last light.', at: '18:45', who: daniel, likes: [maya, jun, priya], comments: [[maya, 'Golden hour king']] },
    { title: 'Shoreline walk', venue: 'East Coast Park', emoji: '🌊', from: '19:45', to: '21:00', photo: PHOTOS.shore, caption: 'Breeze, waves, nothing else.', at: '20:15', who: daniel, likes: [maya, priya], comments: [[priya, 'So calm']] },
  ] })

  // Today: Saturday in the city. The sunset node is created live in the demo, so it is not seeded.
  // Jun shares brunch and the climb with Maya. Dinner is Maya's alone until a guest joins.
  const { day, date: today } = await seedDay({ owner: maya, shift: 0, title: 'Saturday in the city', nodes: [
    { title: 'Brunch at Common Man', venue: 'Common Man Stan', emoji: '🥐', from: '10:00', to: '11:30', with: [jun] },
    { title: 'Climb session at Boulder Planet', venue: 'Boulder Planet Sembawang', emoji: '🧗', from: '13:00', to: '15:00', with: [jun] },
    { title: 'Dinner at Lau Pa Sat', venue: 'Lau Pa Sat', emoji: '🍢', from: '20:00', to: '21:30' },
  ] })
  const todayNodes = must(await sb.from('nodes').select('id, title').eq('day_id', day.id), 'read today nodes')
  const nodeId = (t) => todayNodes.find((n) => n.title.startsWith(t)).id
  const [junPost] = await insert('posts', { node_id: nodeId('Brunch'), author_id: jun, photo_path: PHOTOS.brunchJun, caption: 'Eggs benny arrived. Maya is late again.', created_at: postAt(today, '10:25') })
  const [junClimb] = await insert('posts', { node_id: nodeId('Climb'), author_id: jun, photo_path: PHOTOS.climbJun, caption: 'Finally sent the purple one 💜', created_at: postAt(today, '13:50') })
  await insert('likes', [maya, priya, daniel].map((user_id) => ({ post_id: junPost.id, user_id })))
  await insert('likes', [maya, priya].map((user_id) => ({ post_id: junClimb.id, user_id })))
  await insert('comments', [
    { post_id: junPost.id, author_id: maya, body: 'I was on the way, I swear!', created_at: postAt(today, '10:31') },
    { post_id: junClimb.id, author_id: maya, body: 'Flash it again for the camera 😂', created_at: postAt(today, '13:58') },
  ])

  await seedFriends({ maya, jun, priya, daniel })

  console.log(`Seeded: 4 users, 7 days (3 past + 3 friend trips + Saturday ${today}).`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
