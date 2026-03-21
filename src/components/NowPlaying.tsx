import { useEffect, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, Music2, Volume2, VolumeX, Mic2, ListPlus,
} from 'lucide-react'
import { useLibraryStore } from '../store'
import AddToPlaylist from './AddToPlaylist'

type Tab = 'controls' | 'lyrics'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function SeekBar({ position, duration, onSeek }: { position: number; duration: number; onSeek: (s: number) => void }) {
  const [localPos, setLocalPos] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const displayed = localPos !== null ? localPos : position
  const progress = duration > 0 ? Math.min(displayed / duration, 1) : 0

  function posFromX(clientX: number): number {
    if (!barRef.current || duration <= 0) return displayed
    const rect = barRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    setLocalPos(posFromX(e.clientX))
    const onMove = (ev: MouseEvent) => setLocalPos(posFromX(ev.clientX))
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setLocalPos(null)
      onSeek(posFromX(ev.clientX))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={barRef}
      onMouseDown={handleMouseDown}
      className="relative h-1.5 rounded-full cursor-pointer group select-none"
      style={{ background: 'rgba(255,255,255,0.12)' }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-accent pointer-events-none"
        style={{ width: `${progress * 100}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${progress * 100}% - 7px)` }}
      />
    </div>
  )
}

export default function NowPlaying() {
  const {
    nowPlayingOpen, setNowPlayingOpen,
    playerTrack, isPlaying, setIsPlaying,
    playNext, playPrev,
    repeatMode, shuffleOn, setRepeatMode, toggleShuffle,
    position, duration, setPosition, markSeeked,
    likedPaths, toggleLike, addToQueue,
  } = useLibraryStore()

  const [cover, setCover] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('controls')
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const coverTrackRef = useRef<string | null>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const liked = !!playerTrack && likedPaths.includes(playerTrack.path)

  // Load cover when track changes
  useEffect(() => {
    if (!playerTrack || coverTrackRef.current === playerTrack.path) return
    coverTrackRef.current = playerTrack.path
    setCover(null)
    setTab('controls')
    invoke<string | null>('get_cover_art', { path: playerTrack.path })
      .then((art) => { if (art) setCover(`data:image/jpeg;base64,${art}`) })
      .catch(() => {})
  }, [playerTrack?.path])

  // Sync volume with Rust
  useEffect(() => {
    invoke('player_set_volume', { volume: muted ? 0 : volume }).catch(() => {})
  }, [volume, muted])

  // Scroll lyrics to top when switching tabs
  useEffect(() => {
    if (tab === 'lyrics' && lyricsRef.current) lyricsRef.current.scrollTop = 0
  }, [tab])

  // Close on Escape
  useEffect(() => {
    if (!nowPlayingOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setNowPlayingOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nowPlayingOpen])

  async function handleSeek(secs: number) {
    markSeeked()
    setPosition(secs)
    await invoke('player_seek', { position: secs }).catch(() => {})
  }

  if (!nowPlayingOpen || !playerTrack) return null

  const quality: string[] = []
  if (playerTrack.sampleRate > 0) quality.push(`${(playerTrack.sampleRate / 1000).toFixed(1)} kHz`)
  if (playerTrack.bitrate > 0) quality.push(`${playerTrack.bitrate} kbps`)
  if (playerTrack.format) quality.push(playerTrack.format.toUpperCase())

  const hasLyrics = !!playerTrack.lyrics?.trim()

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070b11]" />
      {cover && (
        <img
          src={cover} aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-15 blur-3xl scale-110 pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

      {/* Close */}
      <button
        onClick={() => setNowPlayingOpen(false)}
        className="absolute top-5 right-6 z-10 w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Layout */}
      <div className="relative flex w-full h-full items-center px-16 gap-14">

        {/* Left: Cover */}
        <div className="flex-none flex flex-col items-center justify-center" style={{ width: '40%' }}>
          <div
            className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] bg-black/40 flex items-center justify-center"
            style={{ width: 360, height: 360 }}
          >
            {cover
              ? <img src={cover} alt="Cover" className="w-full h-full object-cover" />
              : <Music2 className="w-24 h-24 text-zinc-700" />
            }
          </div>

          {/* Quality under cover */}
          {quality.length > 0 && (
            <div className="mt-5">
              <span className="text-[10px] font-semibold text-zinc-500 bg-white/4 border border-white/8 rounded px-2.5 py-1 tracking-widest uppercase">
                {quality.join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Right: Info + tabs */}
        <div className="flex flex-col justify-center gap-0 min-w-0" style={{ width: '60%' }}>

          {/* Track info + actions */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white leading-tight" style={{ wordBreak: 'break-word' }}>
                {playerTrack.title || playerTrack.path.split('/').pop()}
              </h1>
              <p className="text-sm text-zinc-400 mt-1.5">
                {playerTrack.artist || 'Unknown Artist'}
                {playerTrack.album && (
                  <span className="text-zinc-600"> · {playerTrack.album}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-1">
              <button
                onClick={() => { addToQueue(playerTrack); }}
                title="Añadir a cola"
                className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 transition-all"
              >
                <ListPlus className="w-5 h-5" />
              </button>
              <AddToPlaylist trackPath={playerTrack.path} variant="menu-item" />
              <button
                onClick={() => toggleLike(playerTrack.path)}
                className={`p-2 rounded-xl transition-all ${liked ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-300'}`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('controls')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === 'controls'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Reproducción
            </button>
            <button
              onClick={() => setTab('lyrics')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                tab === 'lyrics'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Mic2 className="w-3 h-3" />
              Letra
              {hasLyrics && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          </div>

          {/* Tab content */}
          {tab === 'controls' ? (
            <div className="flex flex-col gap-6">
              {/* Seek bar */}
              <div className="flex flex-col gap-2">
                <SeekBar position={position} duration={duration} onSeek={handleSeek} />
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-500 tabular-nums">{formatTime(position)}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-xl transition-all ${shuffleOn ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                  <button onClick={playPrev} className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/8 transition-all">
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-2xl bg-accent hover:bg-accent/80 flex items-center justify-center shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    {isPlaying
                      ? <Pause className="w-6 h-6 text-white" />
                      : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <button onClick={playNext} className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/8 transition-all">
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>

                <button
                  onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                  className={`p-2.5 rounded-xl transition-all ${repeatMode !== 'off' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={() => setMuted(!muted)} className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="relative flex-1 h-1 group cursor-pointer">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    style={{ left: `calc(${(muted ? 0 : volume) * 100}% - 6px)` }}
                  />
                  <input
                    type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                    onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Lyrics tab */
            <div
              ref={lyricsRef}
              className="overflow-y-auto pr-2"
              style={{ maxHeight: 320 }}
            >
              {hasLyrics ? (
                <p className="text-sm text-zinc-300 leading-8 whitespace-pre-wrap">
                  {playerTrack.lyrics}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Mic2 className="w-10 h-10 text-zinc-700" />
                  <p className="text-sm text-zinc-600">No hay letra disponible</p>
                  <p className="text-xs text-zinc-700">Añade la letra desde el editor de metadatos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
