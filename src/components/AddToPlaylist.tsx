import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useLibraryStore } from '../store'

interface Props {
  trackPath: string
  /** 'icon' = small + button (mini player, song rows), 'menu-item' = full text row (NowPlaying) */
  variant?: 'icon' | 'menu-item'
}

export default function AddToPlaylist({ trackPath, variant = 'icon' }: Props) {
  const { playlists, addToPlaylist, createPlaylist } = useLibraryStore()
  const [open, setOpen] = useState(false)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen((v) => !v)
  }

  function add(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    addToPlaylist(id, trackPath)
    setOpen(false)
  }

  function createAndAdd(e: React.MouseEvent) {
    e.stopPropagation()
    const id = createPlaylist('New Playlist')
    addToPlaylist(id, trackPath)
    setOpen(false)
  }

  const trigger = variant === 'menu-item' ? (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-zinc-300 text-sm font-medium transition-all"
    >
      <Plus className="w-4 h-4" />
      Add to playlist
    </button>
  ) : (
    <button
      onClick={toggle}
      className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
      title="Add to playlist"
    >
      <Plus className="w-4 h-4" />
    </button>
  )

  return (
    <div className="relative">
      {trigger}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 bottom-full mb-2 z-50 w-52 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 py-1.5">
              Add to playlist
            </p>
            {playlists.length === 0 && (
              <p className="text-xs text-zinc-600 px-3 py-1">No playlists yet</p>
            )}
            {playlists.map((pl) => {
              const already = pl.trackPaths.includes(trackPath)
              return (
                <button
                  key={pl.id}
                  onClick={(e) => add(e, pl.id)}
                  disabled={already}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-default hover:bg-white/5 text-zinc-300"
                >
                  {already
                    ? <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    : <div className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{pl.name}</span>
                </button>
              )
            })}
            <div className="border-t border-white/8 mt-1 pt-1">
              <button
                onClick={createAndAdd}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                New playlist
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
