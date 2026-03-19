import { NavLink } from 'react-router-dom'
import { Library, Settings, Music2, Disc3 } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Music2 },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-white/5">
        <Disc3 className="text-accent w-7 h-7" />
        <span className="text-lg font-semibold text-white tracking-tight">Melodix</span>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
               ${isActive
                ? 'bg-accent/15 text-accent'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
               }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 py-4 border-t border-white/5">
        <p className="text-xs text-zinc-600">Melodix v0.1.0</p>
      </div>
    </aside>
  )
}
