import { useState } from 'react'

const KEY = 'hp_theme'
const COLORS = { light: '#faf7ff', dark: '#0f0b1a' }

const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || stored() || 'light')

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* private mode */ }
    applyTheme(next)
    setTheme(next)
  }
  return { theme, toggle }
}
