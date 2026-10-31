// Travel time between two venues in Singapore using OneMap (SLA) routing, with real MRT and bus journeys.
// Venues are free text from users, so they are looked up on OneMap search and then OpenStreetMap, never from a fixed list.

import { onNusCampus, shuttleInfo } from './nus.js'

const ONEMAP = 'https://www.onemap.gov.sg/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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


const title = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

// Several matches for a search box. OneMap knows Singapore places and addresses, OpenStreetMap knows shops and cafes.
export async function places(q) {
  const [om, osm] = await Promise.allSettled([
    fetch(`${ONEMAP}/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`)
      .then((r) => (r.ok ? r.json() : { results: [] })),
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=sg`, { headers: { 'User-Agent': 'happypath-hackathon/1.0' } })
      .then((r) => (r.ok ? r.json() : [])),
  ])
  const out = []
  const seen = new Set()
  const add = (name, address, lat, lng) => {
    const k = `${lat.toFixed(3)},${lng.toFixed(3)}`
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(k)) return
    seen.add(k)
    out.push({ name, address, lat, lng })
  }
  if (om.status === 'fulfilled') {
    for (const x of (om.value.results || []).slice(0, 4)) add(title(x.SEARCHVAL), title(x.ADDRESS), Number(x.LATITUDE), Number(x.LONGITUDE))
  }
  if (osm.status === 'fulfilled') {
    for (const x of osm.value.slice(0, 4)) add(x.name || x.display_name.split(',')[0], x.display_name.split(',').slice(1, 3).join(',').trim(), Number(x.lat), Number(x.lon))
  }
  return out.slice(0, 6)
}

const cache = new Map()

// Returns every way to get from `from` to `to`, fastest first, so the shortest route is options[0].
// from and to can carry coordinates picked in the app, otherwise the free text is looked up.
export async function travel(from, to, departIso, coords = {}) {
  const [a, b] = await Promise.all([coords.from || geocode(from), coords.to || geocode(to)])
  if (!a || !b) return { options: [], error: 'Could not place one of the venues on the map' }
  const hour = (departIso || '').slice(0, 13)
  const key = `${a}|${b}|${hour}`
  if (cache.has(key)) return cache.get(key)
  const settled = await Promise.allSettled([simple(a, b, 'walk'), simple(a, b, 'cycle'), simple(a, b, 'drive'), transit(a, b, departIso)])
  const options = settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value).sort((x, y) => x.minutes - y.minutes)
  if (!options.length) return { options: [], error: settled.find((s) => s.status === 'rejected')?.reason?.message || 'No route found' }
  const out = { from: { name: from, lat: a[0], lng: a[1] }, to: { name: to, lat: b[0], lng: b[1] }, options }
  // Both stops on the NUS campus: the internal shuttle is an option too, with its published frequency.
  if (onNusCampus(a) && onNusCampus(b)) out.shuttle = shuttleInfo(departIso)
  cache.set(key, out)
  return out
}
