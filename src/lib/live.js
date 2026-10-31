import { useEffect, useRef } from 'react'
import { MOCK, supabase } from './supabase'

// In-memory bus used by the mock backend so realtime paths exercise the same code.
const listeners = new Set()
export const mockEmit = (table) => listeners.forEach((l) => l(table))

// Calls refetch whenever one of the tables changes, with a slow poll as fallback.
export function useLive(tables, refetch, enabled = true) {
  const ref = useRef(refetch)
  ref.current = refetch
  const key = tables.join(',')
  useEffect(() => {
    if (!enabled) return
    const fire = () => ref.current()
    let channel
    let off
    if (MOCK) {
      const l = (t) => tables.includes(t) && fire()
      listeners.add(l)
      off = () => listeners.delete(l)
    } else if (supabase) {
      channel = supabase.channel('live-' + key + '-' + Math.random().toString(36).slice(2))
      tables.forEach((table) =>
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire),
      )
      channel.subscribe()
    }
    const poll = setInterval(fire, 4000)
    return () => {
      clearInterval(poll)
      off?.()
      channel && supabase.removeChannel(channel)
    }
  }, [key, enabled])
}
