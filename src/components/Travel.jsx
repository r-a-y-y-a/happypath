import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bike, Bus, Car, ChevronDown, Footprints, TrainFront } from 'lucide-react'
import { get } from '../lib/api'

const ICON = { walk: Footprints, cycle: Bike, drive: Car, transit: TrainFront }
const NAME = { walk: 'Walk', cycle: 'Cycle', drive: 'Drive or taxi', transit: 'Public transport' }
// Walking and cycling are only worth suggesting for short hops.
const PRACTICAL = { walk: 45, cycle: 60 }

const km = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)
const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim())
const coords = (n, k) => (n.lat != null && n.lng != null ? `&${k}Lat=${n.lat}&${k}Lng=${n.lng}` : '')
const venueOf = (n) => (n.venue || n.title || '').trim()

function Legs({ legs }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {legs.map((l, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted">›</span>}
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${l.mode === 'mrt' ? 'bg-mint/20 text-mint' : 'bg-amber/20 text-amber'}`}>
            {l.mode === 'mrt' ? <TrainFront size={11} /> : <Bus size={11} />}{l.label}
          </span>
        </span>
      ))}
    </span>
  )
}

// The way to get from one stop to the next: fastest first, tap for every option.
export default function TravelLeg({ from, to }) {
  const [data, setData] = useState(undefined)
  const [open, setOpen] = useState(false)
  const a = venueOf(from)
  const b = venueOf(to)

  useEffect(() => {
    if (!a || !b || a.toLowerCase() === b.toLowerCase()) return setData(null)
    let live = true
    setData(undefined)
    get(`/travel?from=${encodeURIComponent(a)}&to=${encodeURIComponent(b)}&depart=${encodeURIComponent(from.ends_at)}${coords(from, 'from')}${coords(to, 'to')}`)
      .then((d) => live && setData(d))
      .catch(() => live && setData(null))
    return () => { live = false }
  }, [a, b, from.ends_at, from.lat, from.lng, to.lat, to.lng])

  if (data === null) return null
  if (data === undefined) return <div className="mt-2 h-9 animate-pulse rounded-2xl bg-surface/60" />
  const options = data.options.filter((o) => !PRACTICAL[o.mode] || o.minutes <= PRACTICAL[o.mode])
  const shuttle = data.shuttle
  if (!options.length && !shuttle) return null
  const [best] = options
  const BestIcon = best && ICON[best.mode]

  return (
    <div className="mt-2">
      {best && <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-left text-[13px] active:scale-[0.99]">
        <BestIcon size={15} className="shrink-0 text-mint" />
        <span className="font-bold text-mint">{mins(best.minutes)}</span>
        <span className="min-w-0 flex-1 truncate text-muted">
          {best.mode === 'transit' ? best.legs.map((l) => l.label).join(' › ') || 'Walk' : `${NAME[best.mode]} · ${km(best.meters)}`}
        </span>
        <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint">Fastest</span>
        <ChevronDown size={15} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>}
      {shuttle && (
        <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-amber/10 px-3 py-2 text-[13px]">
          <Bus size={15} className="shrink-0 text-amber" />
          <span className="font-bold text-amber">NUS shuttle</span>
          <span className="min-w-0 flex-1 truncate text-muted">
            every {shuttle.every_min[0] === shuttle.every_min[1] ? `~${shuttle.every_min[0]}` : `${shuttle.every_min[0]} to ${shuttle.every_min[1]}`} min · {shuttle.routes.join(' ')}
          </span>
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && best && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            {options.map((o) => {
              const Icon = ICON[o.mode]
              return (
                <li key={o.mode} className="flex items-start gap-2.5 px-3 py-2 text-[13px]">
                  <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{NAME[o.mode]} <span className="font-normal text-muted">· {km(o.meters)}</span></p>
                    {o.mode === 'transit' && (
                      <div className="mt-1 space-y-1">
                        {o.legs.length ? <Legs legs={o.legs} /> : <span className="text-muted">Walk</span>}
                        <p className="text-[11px] text-muted">
                          {km(o.walk_meters)} walking{o.transfers ? ` · ${o.transfers} ${o.transfers === 1 ? 'transfer' : 'transfers'}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="font-bold">{mins(o.minutes)}</span>
                </li>
              )
            })}
            <li className="px-3 pb-1 text-[10px] text-muted">Routes from OneMap Singapore, using the stop's departure time.{shuttle ? ` ${shuttle.note}` : ''}</li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
