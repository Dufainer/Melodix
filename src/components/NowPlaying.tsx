import { useEffect, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, Music2, Volume2, VolumeX, Mic2, ListPlus, Check,
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

export default function NowPlaying() {
  const {
    nowPlayingOpen, setNowPlayingOpen,
    playerTrack, isPlaying, setIsPlaying,
    playNext, playPrev,
    repeatMode, shuffleOn, setRepeatMode, toggleShuffle,
    position, duration, setPosition, markSeeked,
    likedPaths, toggleLike, addToQueue, playerQueue,
  } = useLibraryStore()
  const inQueue = !!playerTrack && playerQueue.some(t => t.path === playerTrack.path)

  const [cover, setCover] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('controls')
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const coverTrackRef = useRef<string | null>(null)
  const liked = !!playerTrack && likedPaths.includes(playerTrack.path)

  // Load cover on track change
  useEffect(() => {
    if (!playerTrack || coverTrackRef.current === playerTrack.path) return
    coverTrackRef.current = playerTrack.path
    setCover(null)
    setTab('controls')
    invoke<string | null>('get_cover_art', { path: playerTrack.path })
      .then(art => { if (art) setCover(`data:image/jpeg;base64,${art}`) })
      .catch(() => {})
  }, [playerTrack?.path])

  useEffect(() => {
    invoke('player_set_volume', { volume: muted ? 0 : volume }).catch(() => {})
  }, [volume, muted])

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

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[#06090f]" />
      {cover && (
        <>
          <img src={cover} aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 pointer-events-none"
          />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, transparent 20%, rgba(6,9,15,0.85) 70%)' }}
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

      {/* Close */}
      <button
        onClick={() => setNowPlayingOpen(false)}
        className="absolute top-5 right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
        title="Close (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Two-column layout */}
      <div className="relative flex w-full h-full items-center px-16 gap-16">

        {/* LEFT — cover art */}
        <div className="flex-none flex items-center justify-center" style={{ width: '42%' }}>
          <div
            className="rounded-3xl overflow-hidden flex items-center justify-center bg-black/30"
            style={{
              width: 370, height: 370,
              boxShadow: cover
                ? '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 40px 100px rgba(0,0,0,0.5)',
            }}
          >
            {cover
              ? <img src={cover} alt="Cover" className="w-full h-full object-cover" />
              : <Music2 className="w-24 h-24 text-zinc-800" />
            }
          </div>
        </div>

        {/* RIGHT — info + controls */}
        <div className="flex flex-col justify-center min-w-0 gap-5" style={{ width: '58%' }}>

          {/* Track info row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold text-white leading-tight tracking-tight truncate">
                {playerTrack.title || playerTrack.path.split('/').pop()}
              </h1>
              <p className="text-sm text-zinc-400 mt-1 truncate">
                {playerTrack.artist || 'Unknown Artist'}
                {playerTrack.album && (
                  <span className="text-zinc-600"> · {playerTrack.album}</span>
                )}
              </p>
              {quality.length > 0 && (
                <span className="inline-block mt-2 text-[9px] font-bold text-zinc-600 bg-white/4 border border-white/8 rounded px-2 py-0.5 tracking-widest uppercase">
                  {quality.join(' · ')}
                </span>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              <button onClick={() => addToQueue(playerTrack)} disabled={inQueue}
                title={inQueue ? 'Already in queue' : 'Add to queue'}
                className={`p-2 rounded-xl transition-all ${inQueue ? 'text-accent cursor-default' : 'text-zinc-600 hover:text-zinc-300'}`}>
                {inQueue ? <Check className="w-5 h-5" /> : <ListPlus className="w-5 h-5" />}
              </button>
              <AddToPlaylist trackPath={playerTrack.path} variant="menu-item" />
              <button onClick={() => toggleLike(playerTrack.path)}
                className={`p-2 rounded-xl transition-all ${liked ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-300'}`}>
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
            <button onClick={() => setTab('controls')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === 'controls' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              Playback
            </button>
            <button onClick={() => setTab('lyrics')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                tab === 'lyrics' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              <Mic2 className="w-3 h-3" />
              Lyrics
            </button>
          </div>

          {/* TAB: Controls */}
          {tab === 'controls' ? (
            <div className="flex flex-col gap-5">
              {/* Seek bar */}
              <div className="flex flex-col gap-2">
                <div className="relative w-full h-1">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent"
                    style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={position}
                    step={1}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-600 tabular-nums">{formatTime(position)}</span>
                  <span className="text-xs text-zinc-600 tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-between">
                <button onClick={toggleShuffle}
                  className={`p-2.5 rounded-xl transition-all ${shuffleOn ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}>
                  <Shuffle className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={playPrev}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/8 transition-all">
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-2xl bg-accent hover:bg-accent/80 flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.35)] transition-all active:scale-95">
                    {isPlaying
                      ? <Pause className="w-6 h-6 text-white" />
                      : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <button onClick={playNext}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/8 transition-all">
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
                <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                  className={`p-2.5 rounded-xl transition-all ${repeatMode !== 'off' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}>
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={() => setMuted(!muted)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="relative flex-1 h-0.5 group cursor-pointer rounded-full bg-white/10">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/35"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    style={{ left: `calc(${(muted ? 0 : volume) * 100}% - 6px)` }} />
                  <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                    onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
          ) : (
            /* TAB: Lyrics — static from metadata */
            playerTrack.lyrics?.trim() ? (
              <div className="overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
                <p className="text-base text-zinc-300 leading-8 whitespace-pre-wrap">
                  {playerTrack.lyrics}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Mic2 className="w-8 h-8 text-zinc-800" />
                <p className="text-sm text-zinc-500">No lyrics available</p>
                <p className="text-xs text-zinc-700">Update the track metadata to add lyrics</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
