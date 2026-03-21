import { useState, useEffect, useRef } from 'react'
import { Search, X, Play, Music2 } from 'lucide-react'
import { useLibraryStore } from '../store'
import LazyCover from './LazyCover'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { tracks, playTrack } = useLibraryStore()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = query.length >= 1
    ? tracks.filter(t => {
        const q = query.toLowerCase()
        return t.title.toLowerCase().includes(q)
          || t.artist.toLowerCase().includes(q)
          || t.album.toLowerCase().includes(q)
      }).slice(0, 40)
    : []

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="text-[10px] text-zinc-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {query.length === 0 && (
            <p className="text-center text-sm text-zinc-700 py-10">Type to search your library</p>
          )}
          {query.length >= 1 && results.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2 text-zinc-600">
              <Music2 className="w-8 h-8 opacity-30" />
              <p className="text-sm">No results for "{query}"</p>
            </div>
          )}
          {results.map(track => (
            <button
              key={track.path}
              onClick={() => { playTrack(track, results); setOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
                <LazyCover path={track.path} coverArt={track.coverArt} className="w-full h-full" iconSize={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                  {track.title || track.path.split('/').pop()}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {track.artist || 'Unknown Artist'}
                  {track.album ? <span className="text-zinc-600"> · {track.album}</span> : null}
                </p>
              </div>
              <Play className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
          {results.length > 0 && (
            <p className="text-center text-[10px] text-zinc-700 py-2">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
