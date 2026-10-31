// Seeds the demo data. Also the reset-demo script: re-running wipes the four demo users' rows and recreates them.
// Run with: npm run seed
// Today's days are anchored to the moment the seed runs (Maya's climb is live right now, friends have finished stops behind them),
// so run it shortly before presenting.
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PASSWORD = 'happypath-demo'
const TZ = 'Asia/Singapore'
// Photos are static files in public/seed (see CREDITS.md there), served by the app itself, so the demo never hotlinks a third party.
const photo = (name) => `/seed/${name}.jpg`

const PEOPLE = {
  maya: { name: 'Maya', email: 'maya@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=47', bio: 'Brunch first, plans second. Collecting golden hours around the city.' },
  jun: { name: 'Jun', email: 'jun@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=12', bio: 'Boulderer, coffee snob, always 5 minutes late.' },
  priya: { name: 'Priya', email: 'priya@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=5', bio: 'Designer by day, hawker centre hunter by night.' },
  daniel: { name: 'Daniel', email: 'daniel@happypath.demo', avatar: 'https://i.pravatar.cc/300?img=33', bio: 'Runs on kopi and sunsets.' },
}

const PHOTOS = {
  brunch: photo('brunch'),
  pastry: photo('pastry'),
  run: photo('run'),
  beach: photo('beach'),
  newton: photo('newton'),
  hike: photo('hike'),
  ramen: photo('ramen'),
  climbWall: photo('climb-wall'),
  climbCrew: photo('climb-crew'),
  climbJun: photo('climb-jun'),
  climbNew: photo('climb-new'),
  hackNight: photo('hack-night'),
  hackBot: photo('hack-bot'),
  hackPair: photo('hack-pair'),
  hackHall: photo('hack-hall'),
  hackDebate: photo('hack-debate'),
  climbPriya: photo('climb-priya'),
  ubinBike: photo('ubin-bike'),
  ubinCrab: photo('ubin-crab'),
  kaya: photo('kaya'),
  chickenRice: photo('chickenrice'),
  sunset: photo('sunset'),
  shore: photo('shore'),
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
// Today's stops are given in minutes from the moment the seed runs (negative is earlier). Past days use HH:MM.
const NOW = Date.now()
const rel = (min) => new Date(NOW + min * 60000).toISOString()
const when = (date, v) => (typeof v === 'number' ? rel(v) : at(date, v))
// Posts and comments are never in the future, so a photo posted live during the demo always sorts above the seeded ones.
const stamp = (date, v, plusMin = 0) => new Date(Math.min(new Date(when(date, v)).getTime() + plusMin * 60000, NOW - 30000)).toISOString()

async function checkUrls() {
  const missing = Object.values(PHOTOS).filter((p) => !existsSync(new URL(`../public${p}`, import.meta.url)))
  if (missing.length) throw new Error(`Seed photos missing from public/seed:\n${missing.join('\n')}`)
  const urls = Object.values(PEOPLE).map((p) => p.avatar)
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

// Opt in with `--clean-guests`: removes anonymous users (judges and test guests) and, by cascade, their profiles,
// friendships, posts and day memberships. Password users such as the four demo people are never touched.
// A normal seed run leaves guests alone.
async function removeGuests() {
  let removed = 0
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error('list users: ' + error.message)
    for (const u of data.users.filter((x) => x.is_anonymous === true)) {
      const r = await sb.auth.admin.deleteUser(u.id)
      if (r.error) throw new Error('remove guest: ' + r.error.message)
      removed++
    }
    if (data.users.length < 200) break
  }
  return removed
}

async function main() {
  await checkUrls()
  const ids = await ensureUsers()
  const { maya, jun, priya, daniel } = ids

  must(await sb.from('profiles').upsert(
    Object.entries(PEOPLE).map(([k, p]) => ({ id: ids[k], display_name: p.name, avatar_url: p.avatar, bio: p.bio })),
  ), 'upsert profiles')
  await wipe(ids)
  const guests = process.argv.includes('--clean-guests') ? await removeGuests() : null

  // Day members are on every stop of a day, so a stop shared with only one friend uses `with` (stop-level members)
  // on a day that only the owner belongs to. Maya shares stops with Jun alone. Priya and Daniel have their own trips.
  const seedDay = async ({ owner, shift, title, members = [], nodes }) => {
    const date = sgDate(shift)
    const [day] = await insert('days', { owner_id: owner, title, date })
    await insert('day_members', [owner, ...members].map((user_id) => ({ day_id: day.id, user_id })))
    for (const n of nodes) {
      const [node] = await insert('nodes', { day_id: day.id, owner_id: owner, title: n.title, venue: n.venue, emoji: n.emoji, starts_at: when(date, n.from), ends_at: when(date, n.to), ...(n.lat ? { lat: n.lat, lng: n.lng } : {}) })
      await insert('node_members', [...new Set([owner, ...members, ...(n.with || [])])].map((user_id) => ({ node_id: node.id, user_id })))
      // A stop has one photo of its own, or several from different people.
      for (const q of n.posts || (n.photo ? [n] : [])) {
        const [post] = await insert('posts', { node_id: node.id, author_id: q.who, photo_path: q.photo, caption: q.caption, created_at: stamp(date, q.at) })
        await insert('likes', q.likes.map((user_id) => ({ post_id: post.id, user_id })))
        if (q.comments?.length) await insert('comments', q.comments.map(([author_id, body], i) => ({ post_id: post.id, author_id, body, created_at: stamp(date, q.at, 6 * (i + 1)) })))
      }
    }
    return { day, date }
  }

  // Maya's past days. Jun joins only the stops marked `with`.
  await seedDay({ owner: maya, shift: -2, title: 'Slow Sunday', nodes: [
    { title: 'Coffee at Tiong Bahru Bakery', venue: 'Tiong Bahru Bakery', emoji: '☕', from: '09:00', to: '10:30', with: [jun], photo: PHOTOS.pastry, caption: 'Flat white and a kouign-amann. Sunday sorted.', at: '09:40', who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Save me a bite next time!'], [priya, 'That pastry 😍']] },
    { title: 'Run at East Coast Park', venue: 'East Coast Park', emoji: '🏃', from: '17:00', to: '18:30', photo: PHOTOS.run, caption: '10k done, legs gone.', at: '17:50', who: maya, likes: [jun, daniel, priya], comments: [[daniel, 'Pace?? Respect.']] },
  ] })
  await seedDay({ owner: maya, shift: -5, title: 'Beach day', nodes: [
    { title: 'Sentosa beach hangout', venue: 'Palawan Beach', emoji: '🏖️', from: '11:00', to: '14:00', photo: PHOTOS.beach, caption: 'Pretending this is a holiday.', at: '12:15', who: maya, likes: [jun, priya, daniel], comments: [[priya, 'Take me back'], [daniel, 'Best day of the month']] },
    { title: 'Dinner at Newton', venue: 'Newton Food Centre', emoji: '🍢', from: '19:00', to: '21:00', photo: PHOTOS.newton, caption: 'Sambal stingray, no regrets.', at: '19:45', who: maya, likes: [jun, priya], comments: [[priya, 'The stingray!!']] },
  ] })
  await seedDay({ owner: maya, shift: -9, title: 'Hike and ramen', nodes: [
    { title: 'MacRitchie treetop walk', venue: 'MacRitchie Reservoir', emoji: '🥾', from: '07:30', to: '10:00', with: [jun], photo: PHOTOS.hike, caption: 'Up before the sun for this.', at: '08:20', who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Worth the 6am alarm'], [priya, 'Gorgeous light']] },
    { title: 'Ramen night', venue: 'Ippudo Tanjong Pagar', emoji: '🍜', from: '19:30', to: '21:00', photo: PHOTOS.ramen, caption: 'Extra noodles, always.', at: '20:05', who: maya, likes: [jun, priya, daniel], comments: [[daniel, 'Kae-dama gang']] },
  ] })

  // Friends' days are today too, so the Today tab shows what everyone is up to right now.
  // Times are minutes from now: finished stops with photos behind them, and one stop still to come.
  await seedDay({ owner: jun, shift: 0, title: 'Pulau Ubin ride', nodes: [
    { title: 'Bike the Ubin trails', venue: 'Pulau Ubin', emoji: '🚲', from: -420, to: -300, photo: PHOTOS.ubinBike, caption: 'Mud, mangroves and zero signal.', at: -330, who: jun, likes: [maya, daniel], comments: [[maya, 'Next time I am coming with you'], [daniel, 'Your chain fell off twice 😂']] },
    { title: 'Chilli crab lunch at Ubin', venue: 'Ubin Town', emoji: '🦀', from: -280, to: -190, photo: PHOTOS.ubinCrab, caption: 'Earned every bite.', at: -230, who: jun, likes: [maya, priya], comments: [[priya, 'Save me the claws!!']] },
  ] })
  await seedDay({ owner: priya, shift: 0, title: 'Hawker crawl', nodes: [
    { title: 'Breakfast at Tiong Bahru Market', venue: 'Tiong Bahru Market', emoji: '🥞', from: -400, to: -310, photo: PHOTOS.kaya, caption: 'Kaya toast, soft eggs, kopi. Second breakfast loading.', at: -350, who: priya, likes: [maya, jun, daniel], comments: [[maya, 'The queue was worth it?']] },
    { title: 'Chicken rice at Maxwell', venue: 'Maxwell Food Centre', emoji: '🍗', from: -240, to: -120, photo: PHOTOS.chickenRice, caption: 'Chicken rice, obviously.', at: -190, who: priya, likes: [maya, daniel], comments: [[daniel, 'Tian Tian or not?']] },
    { title: 'Satay at Lau Pa Sat', venue: 'Lau Pa Sat', emoji: '🍢', from: 180, to: 270 },
  ] })
  await seedDay({ owner: daniel, shift: 0, title: 'By the bay', nodes: [
    { title: 'Marina Barrage lookout', venue: 'Marina Barrage', emoji: '🌅', from: -200, to: -110, photo: PHOTOS.sunset, caption: 'The bay looks unreal today.', at: -150, who: daniel, likes: [maya, jun, priya], comments: [[maya, 'Golden hour king']] },
    { title: 'Shoreline walk', venue: 'East Coast Park', emoji: '🌊', from: -90, to: 30, photo: PHOTOS.shore, caption: 'Fishermen, breeze, nothing else.', at: -40, who: daniel, likes: [maya, priya], comments: [[priya, 'So calm']] },
  ] })

  // Today is Maya's alone: nobody else is on the day until a judge joins live in the demo.
  // Autonomous Hack @ Acacia is running right now (started 40 minutes ago) with photos already from Maya, Jun and Priya,
  // so a judge who scans the QR can post their own moment into it straight away.
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(NOW)
  const { date: today } = await seedDay({ owner: maya, shift: 0, title: `${weekday} in the city`, nodes: [
    { title: 'Brunch at Common Man', venue: 'Common Man Stan', emoji: '🥐', from: -420, to: -330, photo: PHOTOS.brunch, caption: 'Brunch first, plans second.', at: -370, who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Save me a plate next time!'], [priya, 'Those eggs 😍']] },
    { title: 'Climb session at Boulder Planet', venue: 'Boulder Planet Sembawang', emoji: '🧗', from: -250, to: -130, with: [jun, priya], posts: [
      { photo: PHOTOS.climbWall, caption: 'The project wall for today. Wish me luck.', at: -230, who: maya, likes: [jun, priya, daniel], comments: [[jun, 'That purple route is mine'], [daniel, 'Send it!']] },
      { photo: PHOTOS.climbJun, caption: 'Warm-up done, fingers already cooked.', at: -215, who: jun, likes: [maya, priya], comments: [[maya, 'Show off 😂']] },
      { photo: PHOTOS.climbPriya, caption: 'Slab days are the best days.', at: -200, who: priya, likes: [maya, jun, daniel], comments: [[maya, 'That form!!'], [jun, 'Okay Priya, calm down']] },
      { photo: PHOTOS.climbCrew, caption: 'Rest between attempts. Chalk everywhere.', at: -170, who: maya, likes: [jun, priya] },
      { photo: PHOTOS.climbNew, caption: 'New routes just got set 👀', at: -150, who: jun, likes: [maya, priya, daniel], comments: [[priya, 'I call the yellow one']] },
    ] },
    { title: 'Autonomous Hack @ Acacia', venue: 'Acacia College', emoji: '🤖', lat: 1.3067783, lng: 103.7733147, from: -40, to: 150, with: [jun, priya], posts: [
      { photo: PHOTOS.hackNight, caption: 'Kickoff energy is unreal. Laptops out, agents loading.', at: -34, who: maya, likes: [jun, priya, daniel], comments: [[jun, 'Table by the window is ours'], [daniel, 'Ship it before the demo!']] },
      { photo: PHOTOS.hackBot, caption: 'First autonomous run. It drove straight into a wall. Progress.', at: -27, who: jun, likes: [maya, priya, daniel], comments: [[maya, 'Add a sensor? 😂']] },
      { photo: PHOTOS.hackPair, caption: 'Pair debugging. Send coffee.', at: -19, who: priya, likes: [maya, jun], comments: [[maya, 'On my way with kopi']] },
      { photo: PHOTOS.hackHall, caption: 'The whole hall is locked in.', at: -11, who: maya, likes: [jun, priya] },
      { photo: PHOTOS.hackDebate, caption: 'Architecture debate, round three.', at: -5, who: jun, likes: [maya, priya, daniel], comments: [[priya, 'Just use the queue!']] },
    ] },
    { title: 'Dinner at Lau Pa Sat', venue: 'Lau Pa Sat', emoji: '🍢', from: 200, to: 290 },
  ] })

  await seedFriends({ maya, jun, priya, daniel })

  console.log(`${guests === null ? '' : `Removed ${guests} guest accounts. `}Seeded: 4 users, 7 days (3 of Maya's past, 3 friend days today, Maya's live day ${today}).`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
