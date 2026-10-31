import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const night = theme === 'dark'
  return (
    <button onClick={toggle} aria-label={night ? 'Switch to day mode' : 'Switch to night mode'} title={night ? 'Day mode' : 'Night mode'}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-fg transition active:scale-90 ${className}`}>
      {night ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
