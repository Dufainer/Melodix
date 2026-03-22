import { useMemo, useState } from 'react'
import { Play, Pause, Shuffle, ChevronLeft, Music2, ListPlus, Check } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'
import LazyCover from '../components/LazyCover'
import AddToPlaylist from '../components/AddToPlaylist'
import { useThemeLabels } from '../hooks/useThemeLabels'

// ── Genre color palette ────────────────────────────────────────────────────────

const GRADIENTS: [string, string][] = [
  ['from-violet-700', 'to-purple-950'],
  ['from-blue-700', 'to-indigo-950'],
  ['from-emerald-600', 'to-teal-950'],
  ['from-rose-700', 'to-pink-950'],
  ['from-amber-600', 'to-orange-950'],
  ['from-cyan-600', 'to-blue-950'],
  ['from-fuchsia-700', 'to-violet-950'],
  ['from-lime-600', 'to-green-950'],
  ['from-red-700', 'to-rose-950'],
  ['from-sky-600', 'to-cyan-950'],
  ['from-indigo-600', 'to-slate-950'],
  ['from-pink-700', 'to-fuchsia-950'],
]

function genreGradient(name: string): [string, string] {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff
  return GRADIENTS[hash % GRADIENTS.length]
}

function formatDuration(s: number): string {
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Song row ──────────────────────────────────────────────────────────────────

function SongRow({ track, isActive, isPlaying, onPlay }: {
  track: Track; isActive: boolean; isPlaying: boolean; onPlay: () => void
}) {
  const addToQueue = useLibraryStore(s => s.addToQueue)
  const inQueue = useLibraryStore(s => s.playerQueue.some(t => t.path === track.path))

  return (
    <div
      onClick={onPlay}
      className={`song-row group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer duration-150 ${
        isActive ? 'active bg-accent/15' : 'hover:bg-white/5'
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
        <LazyCover path={track.path} coverArt={track.coverArt} className="absolute inset-0 w-full h-full object-cover" iconSize={16} />
        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity
          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isActive && isPlaying
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-zinc-200'}`}>
          {track.title || track.path.split('/').pop()}
        </p>
        <p className="text-xs text-zinc-500 truncate">{track.artist || 'Unknown Artist'}</p>
      </div>

      <p className="text-xs text-zinc-600 truncate hidden sm:block max-w-[120px] shrink-0">{track.album}</p>

      {track.duration > 0 && (
        <span className="text-xs text-zinc-600 tabular-nums shrink-0 mr-1">
          {formatDuration(track.duration)}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); addToQueue(track) }}
        disabled={inQueue}
        title={inQueue ? 'Already in queue' : 'Add to queue'}
        className={`shrink-0 transition-colors opacity-0 group-hover:opacity-100 p-1 ${inQueue ? 'text-accent cursor-default' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {inQueue ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
      </button>

      <AddToPlaylist trackPath={track.path} />
    </div>
  )
}

// ── Genre card ─────────────────────────────────────────────────────────────────

interface Genre {
  name: string
  tracks: Track[]
  coverPaths: string[]  // up to 4 tracks with cover art for mosaic
}

function GenreCard({ genre, onClick }: { genre: Genre; onClick: () => void }) {
  const [from, to] = genreGradient(genre.name)
  const covers = genre.coverPaths.slice(0, 4)

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-2xl overflow-hidden text-left"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${from} ${to}`} />

      {/* Mosaic of up to 4 covers */}
      {covers.length > 0 && (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-60 group-hover:opacity-80 transition-opacity">
          {covers.map((path, i) => (
            <div key={path + i} className="overflow-hidden">
              <LazyCover path={path} className="w-full h-full" iconSize={0} />
            </div>
          ))}
          {/* Fill empty cells with gradient */}
          {Array.from({ length: 4 - covers.length }).map((_, i) => (
            <div key={`empty-${i}`} className={`bg-gradient-to-br ${from} ${to} opacity-50`} />
          ))}
        </div>
      )}

      {/* Overlay + text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-bold text-white leading-tight truncate drop-shadow">
          {genre.name}
        </p>
        <p className="text-[11px] text-white/60 mt-0.5">
          {genre.tracks.length} {genre.tracks.length === 1 ? 'track' : 'tracks'}
        </p>
      </div>

      {/* Hover play icon */}
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm
                      flex items-center justify-center opacity-0 group-hover:opacity-100
                      transition-all duration-200 scale-90 group-hover:scale-100">
        <Play className="w-3.5 h-3.5 text-white ml-0.5" />
      </div>
    </button>
  )
}

// ── Genre detail ──────────────────────────────────────────────────────────────

function GenreDetail({ genre, onBack }: { genre: Genre; onBack: () => void }) {
  const { playerTrack, isPlaying, playTrack } = useLibraryStore()
  const L = useThemeLabels()
  const [from, to] = genreGradient(genre.name)

  function handlePlayAll() {
    if (genre.tracks.length > 0) playTrack(genre.tracks[0], genre.tracks)
  }

  function handleShuffle() {
    if (genre.tracks.length === 0) return
    const shuffled = [...genre.tracks].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`shrink-0 bg-gradient-to-b ${from} ${to} px-6 pt-5 pb-6`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {L.genresTitle}
        </button>

        <div className="flex items-end gap-5">
          {/* Genre icon / mini mosaic */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 shadow-2xl">
            {genre.coverPaths.slice(0, 4).map((path, i) => (
              <div key={path + i} className="overflow-hidden">
                <LazyCover path={path} className="w-full h-full" iconSize={0} />
              </div>
            ))}
            {genre.coverPaths.length === 0 && (
              <div className={`col-span-2 row-span-2 bg-gradient-to-br ${from} ${to} flex items-center justify-center`}>
                <Music2 className="w-10 h-10 text-white/40" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Genre</p>
            <h1 className="text-2xl font-bold text-white truncate">{genre.name}</h1>
            <p className="text-sm text-white/60 mt-1">
              {genre.tracks.length} {genre.tracks.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
          >
            <Play className="w-4 h-4 ml-0.5" /> Play
          </button>
          <button
            onClick={handleShuffle}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <Shuffle className="w-4 h-4" /> Shuffle
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {genre.tracks.map((track) => (
          <SongRow
            key={track.path}
            track={track}
            isActive={playerTrack?.path === track.path}
            isPlaying={isPlaying}
            onPlay={() => playTrack(track, genre.tracks)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GenrePage() {
  const tracks = useLibraryStore(s => s.tracks)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const L = useThemeLabels()

  const genres = useMemo<Genre[]>(() => {
    const map = new Map<string, Track[]>()
    for (const t of tracks) {
      const g = (t.genre || 'Unknown Genre').trim()
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(t)
    }
    return Array.from(map.entries())
      .map(([name, ts]) => ({
        name,
        tracks: ts.sort((a, b) => (a.title || '').localeCompare(b.title || '')),
        coverPaths: ts.filter(t => t.coverArt).slice(0, 4).map(t => t.path),
      }))
      .sort((a, b) => b.tracks.length - a.tracks.length)
  }, [tracks])

  const filtered = search
    ? genres.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : genres

  const selectedGenre = selected ? genres.find(g => g.name === selected) : null

  if (selectedGenre) {
    return <GenreDetail genre={selectedGenre} onBack={() => setSelected(null)} />
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
        <Music2 className="w-16 h-16 opacity-30" />
        <p className="text-sm">{L.genresNoTracks}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/5 flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-white">{L.genresTitle}</h1>
          <p className="text-xs text-zinc-500">{genres.length} genres · {tracks.length} tracks</p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 w-52">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L.genresSearch}
            className="bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none flex-1 min-w-0"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center mt-12">{L.genresNone}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(genre => (
              <GenreCard key={genre.name} genre={genre} onClick={() => setSelected(genre.name)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
