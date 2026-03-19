import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1, Shuffle, Heart } from 'lucide-react'
import { useLibraryStore } from '../store'
import CoverArt from './CoverArt'
import AddToPlaylist from './AddToPlaylist'

interface PlayerState {
  position: f64
  duration: f64
  finished: boolean
}

// TypeScript doesn't have f64, alias to number
type f64 = number

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Player() {
  const {
    playerTrack, isPlaying, setIsPlaying, playNext, playPrev,
    repeatMode, shuffleOn, setRepeatMode, toggleShuffle, playKey,
    position, duration, setPosition, setDuration, setNowPlayingOpen, markSeeked,
    likedPaths, toggleLike,
  } = useLibraryStore()
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackPathRef = useRef<string | null>(null)

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function startPoll() {
    stopPoll()
    pollRef.current = setInterval(async () => {
      try {
        const state = await invoke<PlayerState>('player_get_state')
        // Suppress position updates for 1.5s after a seek so the backend has time to reflect it
        if (Date.now() - useLibraryStore.getState().lastSeekAt > 1500) {
          setPosition(state.position)
        }
        if (state.duration > 0) setDuration(state.duration)

        // Auto-advance when track finishes
        if (state.finished && trackPathRef.current) {
          trackPathRef.current = null
          stopPoll()
          playNext()
        }
      } catch {
        // ignore poll errors
      }
    }, 500)
  }

  // Listen for MPRIS control events (system media keys, media applets, etc.)
  useEffect(() => {
    const unlisten = listen<string>('mpris-control', (event) => {
      const action = event.payload
      if (action === 'play') setIsPlaying(true)
      else if (action === 'pause') setIsPlaying(false)
      else if (action === 'toggle') setIsPlaying(!useLibraryStore.getState().isPlaying)
      else if (action === 'next') playNext()
      else if (action === 'prev') playPrev()
      else if (action === 'stop') setIsPlaying(false)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  // Load and play when track changes
  useEffect(() => {
    if (!playerTrack) {
      invoke('player_stop').catch(() => {})
      stopPoll()
      setPosition(0)
      setDuration(0)
      return
    }

    trackPathRef.current = playerTrack.path
    setLoading(true)
    setPosition(0)
    setDuration(0)


    invoke<number>('player_play', {
      path: playerTrack.path,
      title: playerTrack.title || null,
      artist: playerTrack.artist || null,
      album: playerTrack.album || null,
    })
      .then((dur) => {
        if (dur > 0) setDuration(dur)
        // Apply current volume/mute
        const v = muted ? 0 : volume
        return invoke('player_set_volume', { volume: v })
      })
      .then(() => startPoll())
      .catch((err) => {
        console.error('player_play failed:', err)
        setIsPlaying(false)
      })
      .finally(() => setLoading(false))

    return () => { /* cleanup handled on next effect run */ }
  }, [playerTrack?.path, playKey])

  // Sync play/pause with Rust
  useEffect(() => {
    if (!playerTrack || loading) return
    if (isPlaying) {
      invoke('player_resume').catch(() => {})
      startPoll()
    } else {
      invoke('player_pause').catch(() => {})
      stopPoll()
    }
  }, [isPlaying, loading])

  // Sync volume/mute with Rust
  useEffect(() => {
    const v = muted ? 0 : volume
    invoke('player_set_volume', { volume: v }).catch(() => {})
  }, [volume, muted])

  // Cleanup on unmount
  useEffect(() => () => {
    stopPoll()
    invoke('player_stop').catch(() => {})
  }, [])

  if (!playerTrack) return null

  const progress = duration > 0 ? position / duration : 0

  async function handleSeek(secs: number) {
    markSeeked()
    setPosition(secs)
    await invoke('player_seek', { position: secs }).catch(() => {})
  }

  return (
    <div className="shrink-0 border-t border-white/5 bg-surface flex items-center gap-4 px-5 h-[72px]">
      {/* Track info — click opens NowPlaying */}
      <div className="flex items-center gap-2 w-56 shrink-0 min-w-0">
        <button
          onClick={() => setNowPlayingOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <CoverArt src={playerTrack.coverArt} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">
              {playerTrack.title || playerTrack.path.split('/').pop()}
            </p>
            <p className="text-xs text-zinc-500 truncate">{playerTrack.artist}</p>
          </div>
        </button>
        <button
          onClick={() => toggleLike(playerTrack.path)}
          className={`shrink-0 transition-colors ${likedPaths.includes(playerTrack.path) ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-300'}`}
        >
          <Heart className={`w-4 h-4 ${likedPaths.includes(playerTrack.path) ? 'fill-current' : ''}`} />
        </button>
        <AddToPlaylist trackPath={playerTrack.path} />
      </div>

      {/* Controls + seek */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            title="Aleatorio"
            className={`transition-colors ${shuffleOn ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={playPrev} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-40"
          >
            {isPlaying && !loading
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={playNext} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
            title={repeatMode === 'off' ? 'Sin repetir' : repeatMode === 'all' ? 'Repetir todo' : 'Repetir una'}
            className={`transition-colors ${repeatMode !== 'off' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            {repeatMode === 'one'
              ? <Repeat1 className="w-4 h-4" />
              : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-[10px] text-zinc-600 w-8 text-right tabular-nums">
            {formatTime(position)}
          </span>
          <div className="relative flex-1 h-1">
            <div className="absolute inset-0 rounded-full bg-white/10" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${progress * 100}%` }}
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
          <span className="text-[10px] text-zinc-600 w-8 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-28 shrink-0">
        <button
          onClick={() => setMuted(!muted)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
        >
          {muted || volume === 0
            ? <VolumeX className="w-4 h-4" />
            : <Volume2 className="w-4 h-4" />}
        </button>
        <div className="relative flex-1 h-1">
          <div className="absolute inset-0 rounded-full bg-white/10" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${(muted ? 0 : volume) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
