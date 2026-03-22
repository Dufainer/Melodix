import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1, Shuffle, Heart, ListMusic, Moon, SlidersHorizontal, Wand2 } from 'lucide-react'
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
    likedPaths, toggleLike, recordPlay,
    queueOpen, setQueueOpen, playerQueue,
    sleepTimerEndsAt, setSleepTimer,
    nowPlayingOpen,
    eqPanelOpen, setEqPanelOpen,
    effectsPanelOpen, setEffectsPanelOpen,
    effectSpeed, effectReverbWet,
  } = useLibraryStore()
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackPathRef = useRef<string | null>(null)
  const listenStartRef = useRef<number | null>(null)
  const accumulatedRef = useRef<number>(0)
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  const gainRef = useRef(1)
  const fadeInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const crossfadeActiveRef = useRef(false)

  // Keep refs current so interval callbacks always see latest values
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = muted }, [muted])

  // Recompute ReplayGain multiplier when track changes
  useEffect(() => {
    if (!playerTrack) { gainRef.current = 1; return }
    const mode = useLibraryStore.getState().replayGainMode
    if (mode === 'off') { gainRef.current = 1; return }
    const gainDb = mode === 'album'
      ? (playerTrack.replayGainAlbum ?? playerTrack.replayGainTrack)
      : playerTrack.replayGainTrack
    gainRef.current = gainDb != null ? Math.pow(10, gainDb / 20) : 1
  }, [playerTrack?.path])

  function getListened(): number {
    if (listenStartRef.current !== null)
      return accumulatedRef.current + (Date.now() - listenStartRef.current) / 1000
    return accumulatedRef.current
  }

  function startListening() {
    listenStartRef.current = Date.now()
  }

  function pauseListening() {
    if (listenStartRef.current !== null) {
      accumulatedRef.current += (Date.now() - listenStartRef.current) / 1000
      listenStartRef.current = null
    }
  }

  function resetListening() {
    listenStartRef.current = null
    accumulatedRef.current = 0
  }

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
        // Sleep timer check
        const s = useLibraryStore.getState()
        if (s.sleepTimerEndsAt && Date.now() >= s.sleepTimerEndsAt) {
          s.setSleepTimer(null)
          s.setIsPlaying(false)
          invoke('player_pause').catch(() => {})
          stopPoll()
          return
        }

        const state = await invoke<PlayerState>('player_get_state')
        if (Date.now() - useLibraryStore.getState().lastSeekAt > 1500) {
          setPosition(state.position)
        }
        if (state.duration > 0) setDuration(state.duration)

        // Crossfade fade-out: reduce volume as track nears end
        const xfade = useLibraryStore.getState().crossfadeDuration
        if (xfade > 0 && state.duration > 0 && !state.finished && !crossfadeActiveRef.current) {
          const remaining = state.duration - state.position
          if (remaining > 0 && remaining <= xfade) {
            const ratio = remaining / xfade
            const baseVol = mutedRef.current ? 0 : volumeRef.current
            invoke('player_set_volume', { volume: baseVol * ratio * gainRef.current }).catch(() => {})
          }
        }

        // Auto-advance when track finishes
        if (state.finished && trackPathRef.current) {
          const listened = getListened()
          if (listened >= 5) recordPlay(trackPathRef.current, listened)
          resetListening()
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

    // Clear any active crossfade fade-in
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current)
      fadeInIntervalRef.current = null
    }
    crossfadeActiveRef.current = false

    // Record actual listened time for the previous track before switching
    const prevPath = trackPathRef.current
    if (prevPath && prevPath !== playerTrack.path) {
      const listened = getListened()
      if (listened >= 5) recordPlay(prevPath, listened)
    }
    resetListening()

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
      .then(async (dur) => {
        if (dur > 0) setDuration(dur)
        const xfade = useLibraryStore.getState().crossfadeDuration
        if (xfade > 0) {
          // Fade in from 0
          crossfadeActiveRef.current = true
          await invoke('player_set_volume', { volume: 0 })
          let elapsed = 0
          fadeInIntervalRef.current = setInterval(() => {
            elapsed += 0.1
            const ratio = Math.min(elapsed / xfade, 1)
            const baseVol = mutedRef.current ? 0 : volumeRef.current
            invoke('player_set_volume', { volume: baseVol * ratio * gainRef.current }).catch(() => {})
            if (ratio >= 1) {
              crossfadeActiveRef.current = false
              if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current)
              fadeInIntervalRef.current = null
            }
          }, 100)
        } else {
          const v = mutedRef.current ? 0 : volumeRef.current
          await invoke('player_set_volume', { volume: v * gainRef.current })
        }
      })
      .then(() => startPoll())
      .catch((err) => {
        console.error('player_play failed:', err)
        setIsPlaying(false)
      })
      .finally(() => setLoading(false))

    return () => { /* cleanup handled on next effect run */ }
  }, [playerTrack?.path, playKey])

  // Lazy-load cover art for the current track if not already cached
  useEffect(() => {
    if (!playerTrack || playerTrack.coverArt) return
    invoke<string | null>('get_cover_art', { path: playerTrack.path })
      .then(art => { if (art) useLibraryStore.getState().updateTrack(playerTrack.path, { coverArt: art }) })
      .catch(() => {})
  }, [playerTrack?.path])

  // Sync play/pause with Rust
  useEffect(() => {
    if (!playerTrack || loading) return
    if (isPlaying) {
      startListening()
      invoke('player_resume').catch(() => {})
      startPoll()
    } else {
      pauseListening()
      invoke('player_pause').catch(() => {})
      stopPoll()
    }
  }, [isPlaying, loading])

  // Sync volume/mute with Rust (skip during crossfade fade-in)
  useEffect(() => {
    if (crossfadeActiveRef.current) return
    const v = muted ? 0 : volume
    invoke('player_set_volume', { volume: v * gainRef.current }).catch(() => {})
  }, [volume, muted])

  // Cleanup on unmount
  useEffect(() => () => {
    if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current)
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

  if (nowPlayingOpen) return null

  return (
    <div className="player-bar shrink-0 flex items-center gap-4 px-5 h-[72px]">
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
            title="Shuffle"
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
            title={repeatMode === 'off' ? 'No repeat' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
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

      {/* Queue + Sleep timer indicator */}
      <div className="flex items-center gap-3 w-40 shrink-0">
        {sleepTimerEndsAt && (
          <button
            onClick={() => setSleepTimer(null)}
            title="Sleep timer active — click to cancel"
            className="shrink-0 text-accent opacity-70 hover:opacity-100 transition-opacity"
          >
            <Moon className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setEffectsPanelOpen(!effectsPanelOpen)}
          title="Audio effects"
          className={`shrink-0 transition-colors relative ${effectsPanelOpen ? 'text-accent' : (effectSpeed !== 1 || effectReverbWet > 0) ? 'text-accent/70 hover:text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
        >
          <Wand2 className="w-4 h-4" />
          {(effectSpeed !== 1 || effectReverbWet > 0) && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>
        <button
          onClick={() => setEqPanelOpen(!eqPanelOpen)}
          title="Equalizer"
          className={`shrink-0 transition-colors ${eqPanelOpen ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button
          onClick={() => setQueueOpen(!queueOpen)}
          title="Playback queue"
          className={`shrink-0 transition-colors relative ${queueOpen ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200'}`}
        >
          <ListMusic className="w-4 h-4" />
          {playerQueue.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] leading-none bg-accent text-black font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {Math.min(playerQueue.length - 1, 99)}
            </span>
          )}
        </button>
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
