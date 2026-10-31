import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Compass, UserRound, Users } from 'lucide-react'

const TABS = [
  { id: 'day', to: '/', label: 'My day', Icon: CalendarDays },
  { id: 'friends', to: '/friends', label: "Friends' days", Icon: Compass },
  { id: 'social', to: '/social', label: 'Social', Icon: Users },
  { id: 'account', to: '/account', label: 'Account', Icon: UserRound },
]

// Links that leave a tab pass state.from so the bar keeps the tab the person came from.
function activeTab({ pathname, state }) {
  if (state?.from) return state.from
  if (pathname.startsWith('/friends')) return 'friends'
  if (pathname.startsWith('/social') || pathname.startsWith('/profile')) return 'social'
  if (pathname.startsWith('/account')) return 'account'
  return 'day'
}

export default function BottomNav() {
  const active = activeTab(useLocation())
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-2 bg-page/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map(({ id, to, label, Icon }) => {
          const on = id === active
          return (
            <li key={id} className="flex-1">
              <Link to={to} aria-current={on ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition active:scale-95 ${on ? 'bg-coral/15 text-coral-ink' : 'text-muted'}`}>
                <Icon size={22} strokeWidth={on ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
