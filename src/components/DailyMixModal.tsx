import { useState, useMemo } from 'react'
import { X, Play, Shuffle, ListPlus, Check, Music2 } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  dailyMix: Track[]
  artistStats: { artist: string; plays: number }[]
}

function formatTotal(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDur(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const HERO_COVERS: React.CSSProperties[] = [
  { top: '-12%', left: '-4%',  width: 210, height: 210, transform: 'rotate(-7deg)',  borderRadius: 20 },
  { top: '-5%',  left: '38%',  width: 170, height: 170, transform: 'rotate(8deg)',   borderRadius: 20 },
  { top: '12%',  left: '72%',  width: 150, height: 150, transform: 'rotate(-3deg)',  borderRadius: 20 },
]

export default function DailyMixModal({ open, onClose, dailyMix, artistStats }: Props) {
  const { playTrack, createPlaylist, addToPlaylist, playlists, playerTrack, isPlaying, setIsPlaying } = useLibraryStore()
  const today = new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const alreadySaved = playlists.some(p => p.name === `Daily Mix · ${today}`)
  const [saved, setSaved] = useState(false)

  const totalDuration = useMemo(
    () => dailyMix.reduce((s, t) => s + (t.duration ?? 0), 0),
    [dailyMix]
  )

  const heroCoverTracks = dailyMix.filter(t => t.coverArt).slice(0, 3)

  if (!open) return null

  function handlePlay() {
    if (dailyMix.length === 0) return
    const active = playerTrack && dailyMix.some(t => t.path === playerTrack.path)
    if (active) { setIsPlaying(!isPlaying); return }
    playTrack(dailyMix[0], dailyMix)
  }

  function handleShuffle() {
    if (dailyMix.length === 0) return
    const shuffled = [...dailyMix].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
  }

  function handleSavePlaylist() {
    const today = new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })
    const name = `Daily Mix · ${today}`
    if (playlists.some(p => p.name === name)) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return
    }
    const id = createPlaylist(name)
    dailyMix.forEach(t => addToPlaylist(id, t.path))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handlePlayTrack(track: Track, index: number) {
    if (playerTrack?.path === track.path) {
      setIsPlaying(!isPlaying)
    } else {
      playTrack(track, dailyMix.slice(index))
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#080c12] overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: 260 }}>
        {/* Scattered album covers */}
        {HERO_COVERS.map((style, i) => {
          const track = heroCoverTracks[i]
          return track?.coverArt ? (
            <img
              key={i}
              src={`data:image/jpeg;base64,${track.coverArt}`}
              aria-hidden
              className="absolute object-cover opacity-75 pointer-events-none select-none"
              style={style}
            />
          ) : (
            <div
              key={i}
              aria-hidden
              className="absolute bg-white/5 border border-white/8 pointer-events-none"
              style={style}
            />
          )
        })}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#080c12] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-zinc-300 hover:text-white transition-all backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title + stats */}
        <div className="absolute bottom-5 left-5 z-10">
          <h1 className="text-4xl font-bold text-white leading-tight">Daily Mix</h1>
          <p className="text-xs text-zinc-400 mt-1.5">
            {dailyMix.length} songs · {formatTotal(totalDuration)}
          </p>
          {artistStats.length > 0 && (
            <p className="text-[11px] text-zinc-600 mt-1">
              Based on · {artistStats.slice(0, 3).map(a => a.artist).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-4 border-b border-white/5">
        <button
          onClick={handlePlay}
          disabled={dailyMix.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-all disabled:opacity-30 shadow-lg shadow-accent/20"
        >
          <Play className="w-4 h-4" />
          Play it
        </button>
        <button
          onClick={handleShuffle}
          disabled={dailyMix.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/8 hover:bg-white/15 text-zinc-300 text-sm font-semibold transition-all disabled:opacity-30"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </button>
        <button
          onClick={handleSavePlaylist}
          disabled={dailyMix.length === 0 || saved || alreadySaved}
          className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
            saved || alreadySaved
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
          {saved || alreadySaved ? 'Already saved' : 'Save as Playlist'}
        </button>
      </div>

      {/* ── Artist stats bar ──────────────────────────────────────── */}
      {artistStats.length > 0 && (
        <div className="shrink-0 px-5 py-3 border-b border-white/5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-2">Most Played Artists</p>
          <div className="flex flex-col gap-1.5">
            {artistStats.slice(0, 4).map(({ artist, plays }, i) => {
              const maxPlays = artistStats[0].plays
              const pct = Math.round((plays / maxPlays) * 100)
              return (
                <div key={artist} className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600 w-3 tabular-nums">{i + 1}</span>
                  <span className="text-xs text-zinc-400 w-32 truncate">{artist}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/50"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600 tabular-nums w-14 text-right">
                    {plays} {plays === 1 ? 'play' : 'plays'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Track list ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 px-3">
        {dailyMix.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 py-16">
            <Music2 className="w-12 h-12 opacity-20" />
            <p className="text-sm text-zinc-500">Play some songs to build your Daily Mix</p>
          </div>
        ) : (
          dailyMix.map((track, i) => {
            const active = playerTrack?.path === track.path
            return (
              <div
                key={track.path}
                onClick={() => handlePlayTrack(track, i)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  active ? 'bg-accent/15' : 'hover:bg-white/5'
                }`}
              >
                <span className={`text-xs tabular-nums w-5 text-right shrink-0 ${active ? 'text-accent' : 'text-zinc-700'}`}>
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                  {track.coverArt
                    ? <img src={`data:image/jpeg;base64,${track.coverArt}`} alt="" className="w-full h-full object-cover" />
                    : <Music2 className="w-4 h-4 text-zinc-700" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${active ? 'text-accent' : 'text-zinc-200'}`}>
                    {track.title || track.path.split('/').pop()}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{track.artist || 'Unknown Artist'}</p>
                </div>
                {track.duration > 0 && (
                  <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatDur(track.duration)}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
