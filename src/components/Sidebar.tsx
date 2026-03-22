import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Library, Settings, Music2, Disc3, ListMusic, Heart, Mic2, Plus, ListVideo, Pencil, Trash2, BarChart2, Tag, Search } from 'lucide-react'
import { useLibraryStore } from '../store'
import { useThemeLabels } from '../hooks/useThemeLabels'

export default function Sidebar() {
  const navigate = useNavigate()
  const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = useLibraryStore()
  const L = useThemeLabels()

  const NAV_ITEMS = [
    { to: '/', label: L.navHome, icon: Music2 },
    { to: '/player', label: L.navSongs, icon: ListMusic },
    { to: '/albums', label: L.navAlbums, icon: Disc3 },
    { to: '/artists', label: L.navArtists, icon: Mic2 },
    { to: '/genres', label: L.navGenres, icon: Tag },
    { to: '/likes', label: L.navLikes, icon: Heart },
    { to: '/stats', label: L.navStats, icon: BarChart2 },
  ]

  const BOTTOM_ITEMS = [
    { to: '/library', label: L.navTagEditor, icon: Library },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleCreate() {
    setCreatingNew(true)
    setNewName('New Playlist')
  }

  function commitCreate() {
    const name = newName.trim()
    if (name) {
      const id = createPlaylist(name)
      navigate(`/playlist/${id}`)
    }
    setCreatingNew(false)
    setNewName('')
  }

  function startRename(id: string, current: string) {
    setEditingId(id)
    setEditValue(current)
  }

  function commitRename() {
    if (editingId && editValue.trim()) renamePlaylist(editingId, editValue.trim())
    setEditingId(null)
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive ? 'bg-accent/15 text-accent' : 'text-zinc-400 hover:text-white hover:bg-white/5'
    }`

  return (
    <aside className="sidebar flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-white/5 shrink-0">
        <Disc3 className="text-accent w-7 h-7" />
        <span className="text-lg font-semibold text-white tracking-tight">Melodix</span>
      </div>

      {/* Global search shortcut */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 text-zinc-500 hover:text-zinc-300 transition-all text-xs"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">{L.navSearchPlaceholder}</span>
        <kbd className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 shrink-0">⌃K</kbd>
      </button>

      {/* Main nav */}
      <nav className="mt-3 flex flex-col gap-1 px-3 shrink-0">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Playlists section */}
      <div className="mt-5 px-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-1 mb-2 shrink-0">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{L.navPlaylists}</span>
          <button
            onClick={handleCreate}
            className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/8 transition-all"
            title="New playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
          {/* New playlist input */}
          {creatingNew && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <ListVideo className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={commitCreate}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') setCreatingNew(false) }}
                className="flex-1 bg-transparent text-sm text-zinc-200 outline-none min-w-0"
              />
            </div>
          )}

          {playlists.length === 0 && !creatingNew && (
            <p className="text-xs text-zinc-700 px-3 py-2">{L.navNoPlaylists}</p>
          )}

          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="group relative"
            >
              {editingId === pl.id ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5">
                  <ListVideo className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 bg-transparent text-sm text-zinc-200 outline-none min-w-0"
                  />
                </div>
              ) : (
                <NavLink
                  to={`/playlist/${pl.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 pr-16 ${
                      isActive ? 'bg-accent/15 text-accent' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <ListVideo className="w-4 h-4 shrink-0" />
                  <span className="truncate">{pl.name}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{pl.trackPaths.length}</span>
                </NavLink>
              )}

              {/* Hover actions / confirm delete */}
              {editingId !== pl.id && (
                confirmDeleteId === pl.id ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => { deletePlaylist(pl.id); setConfirmDeleteId(null) }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-zinc-400 hover:bg-white/10 transition-all"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startRename(pl.id, pl.name)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/10"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(pl.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 flex flex-col gap-1 px-3 pt-2 pb-3 border-t border-white/5 mt-2">
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
        <p className="text-xs text-zinc-700 px-3 pt-2">Melodix v0.2.0</p>
      </nav>
    </aside>
  )
}
