import { useSyncExternalStore } from 'react'

// Demo clock: all window and banner logic reads this, never Date.now() directly.
let offset = Number(localStorage.getItem('hp_clock_offset') || 0)
let tick = 0
let dayNodes = []
const subs = new Set()
const emit = () => subs.forEach((f) => f())

setInterval(() => { tick++; emit() }, 1000)

export const now = () => Date.now() + offset
export const isJumped = () => offset !== 0

export function jumpTo(ms) {
  offset = ms - Date.now()
  localStorage.setItem('hp_clock_offset', String(offset))
  emit()
}
export function resetClock() {
  offset = 0
  localStorage.removeItem('hp_clock_offset')
  emit()
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
