// Travel time between two venues in Singapore using OneMap (SLA) routing, with real MRT and bus journeys.
// Venues are free text, so they are geocoded first: demo venues, then OneMap search, then OpenStreetMap.

const ONEMAP = 'https://www.onemap.gov.sg/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Demo venues are pinned so the demo never depends on a geocoder or its rate limit.
const KNOWN = {
  'common man stan': [1.2802937, 103.8479121],
  'boulder planet sembawang': [1.4418486, 103.8248492],
  'marina barrage': [1.2799057, 103.8704696],
  'lau pa sat': [1.2805942, 103.8504084],
  'east coast park': [1.3132664, 103.9245686],
}

const geoCache = new Map()
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')

async function onemapSearch(q) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(`${ONEMAP}/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=N&pageNum=1`)
    if (r.status === 429) { await sleep(1100); continue }
    if (!r.ok) return null
    const x = (await r.json()).results?.[0]
    return x ? [Number(x.LATITUDE), Number(x.LONGITUDE)] : null
  }
  return null
}

async function osmSearch(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=sg`, {
    headers: { 'User-Agent': 'happypath-hackathon/1.0' },
  })
  if (!r.ok) return null
  const x = (await r.json())[0]
  return x ? [Number(x.lat), Number(x.lon)] : null
}

export async function geocode(name) {
  const key = norm(name)
  if (!key) return null
  if (KNOWN[key]) return KNOWN[key]
  if (!geoCache.has(key)) {
    geoCache.set(key, (async () => (await onemapSearch(name)) || (await osmSearch(`${name} Singapore`)))().catch(() => null))
  }
  const hit = await geoCache.get(key)
  if (!hit) geoCache.delete(key)
  return hit
}

// OneMap wants the date as MM-DD-YYYY and the time as HH:mm:ss, in Singapore time.
function sgParts(iso) {
  const d = iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso) : new Date()
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.month}-${p.day}-${p.year}`, time: `${p.hour}:${p.minute}:${p.second}` }
}

async function oneMapRoute(params) {
  const token = process.env.ONEMAP_TOKEN
  if (!token) throw new Error('ONEMAP_TOKEN is not set')
  const r = await fetch(`${ONEMAP}/public/routingsvc/route?${new URLSearchParams(params)}`, { headers: { Authorization: token } })
  if (!r.ok) throw new Error(`OneMap ${r.status}`)
  return r.json()
}

const simple = async (a, b, routeType) => {
  const j = await oneMapRoute({ start: a.join(','), end: b.join(','), routeType })
  const s = j.route_summary
  if (!s) return null
  return { mode: routeType === 'drive' ? 'drive' : routeType, minutes: Math.max(1, Math.round(s.total_time / 60)), meters: Math.round(s.total_distance) }
}

const legLabel = (l) => (l.mode === 'SUBWAY' || l.mode === 'RAIL' ? `MRT ${l.route || ''}` : l.mode === 'BUS' ? `Bus ${l.route || ''}` : l.mode).trim()

const transit = async (a, b, departIso) => {
  const { date, time } = sgParts(departIso)
  const j = await oneMapRoute({ start: a.join(','), end: b.join(','), routeType: 'pt', date, time, mode: 'TRANSIT', maxWalkDistance: '1000', numItineraries: '3' })
  const its = (j.plan?.itineraries || []).map((i) => ({
    mode: 'transit',
    minutes: Math.max(1, Math.round(i.duration / 60)),
    meters: Math.round(i.legs.reduce((n, l) => n + (l.distance || 0), 0)),
    walk_meters: Math.round(i.walkDistance || 0),
    transfers: i.transfers ?? Math.max(0, i.legs.filter((l) => l.mode !== 'WALK').length - 1),
    legs: i.legs.filter((l) => l.mode !== 'WALK').map((l) => ({ mode: l.mode === 'BUS' ? 'bus' : 'mrt', label: legLabel(l), from: l.from?.name, to: l.to?.name })),
  }))
  return its.sort((x, y) => x.minutes - y.minutes)[0] || null
}

const cache = new Map()

// Returns every way to get from `from` to `to`, fastest first, so the shortest route is options[0].
export async function travel(from, to, departIso) {
  const [a, b] = await Promise.all([geocode(from), geocode(to)])
  if (!a || !b) return { options: [], error: 'Could not place one of the venues on the map' }
  const hour = (departIso || '').slice(0, 13)
  const key = `${a}|${b}|${hour}`
  if (cache.has(key)) return cache.get(key)
  const settled = await Promise.allSettled([simple(a, b, 'walk'), simple(a, b, 'cycle'), simple(a, b, 'drive'), transit(a, b, departIso)])
  const options = settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value).sort((x, y) => x.minutes - y.minutes)
  if (!options.length) return { options: [], error: settled.find((s) => s.status === 'rejected')?.reason?.message || 'No route found' }
  const out = { from: { name: from, lat: a[0], lng: a[1] }, to: { name: to, lat: b[0], lng: b[1] }, options }
  cache.set(key, out)
  return out
}
