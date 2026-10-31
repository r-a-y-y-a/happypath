import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Demo clock: all window and banner logic reads this, never Date.now() directly.
let offset = Number(localStorage.getItem('hp_clock_offset') || 0)
let tick = 0
let dayNodes = []
const subs = new Set()
const emit = () => subs.forEach((f) => f())

setInterval(() => { tick++; emit() }, 1000)

export const now = () => Date.now() + offset
export const isJumped = () => offset !== 0

// The jump is shared with every phone on the same day over a Realtime broadcast channel,
// and the invite link carries the current offset for anyone joining after the jump.
let channel = null
const KEY = 'hp_clock_offset'
export const getOffset = () => offset
export function setOffset(o) {
  offset = o
  if (o) localStorage.setItem(KEY, String(o))
  else localStorage.removeItem(KEY)
  emit()
}
const share = () => channel?.send({ type: 'broadcast', event: 'offset', payload: { offset } })

export function jumpTo(ms) {
  setOffset(ms - Date.now())
  share()
}
export function resetClock() {
  setOffset(0)
  share()
}
export function syncClock(dayId) {
  if (!supabase || !dayId) return undefined
  const ch = supabase.channel('clock-' + dayId, { config: { broadcast: { self: false } } })
  ch.on('broadcast', { event: 'offset' }, ({ payload }) => setOffset(Number(payload.offset) || 0))
  // A phone that has already jumped tells a phone that has just connected.
  ch.subscribe((status) => { if (status === 'SUBSCRIBED' && offset) ch.send({ type: 'broadcast', event: 'offset', payload: { offset } }) })
  channel = ch
  return () => { channel = null; supabase.removeChannel(ch) }
}
export function setClockNodes(nodes) {
  dayNodes = nodes
  emit()
}

const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
export function useNow() {
  useSyncExternalStore(subscribe, () => tick + ':' + offset)
  return now()
}
export function useClockNodes() {
  return useSyncExternalStore(subscribe, () => dayNodes)
}

const HALF_HOUR = 30 * 60 * 1000
export function nodeState(node, t = now()) {
  const s = new Date(node.starts_at).getTime()
  const e = new Date(node.ends_at).getTime()
  if (t < s) return 'upcoming'
  if (t <= e) return 'live'
  if (t <= e + HALF_HOUR) return 'grace'
  return 'past'
}
export const windowOpen = (node, t) => ['live', 'grace'].includes(nodeState(node, t))
