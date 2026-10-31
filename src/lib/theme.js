import { useEffect, useState } from 'react'

const KEY = 'hp_theme'
const COLORS = { light: '#faf7ff', dark: '#0f0b1a' }

const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const system = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || stored() || system())

  useEffect(() => {
    // Follow the OS setting until the user picks one explicitly.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (!stored()) { const t = system(); applyTheme(t); setTheme(t) } }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* private mode */ }
    applyTheme(next)
    setTheme(next)
  }
  return { theme, toggle }
}
