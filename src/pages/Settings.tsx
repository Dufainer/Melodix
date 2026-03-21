import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { Info, FolderOpen, X, RefreshCw, Moon } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { useLibraryStore } from '../store'
import { buildPreviewPath } from '../services/fileOps'
import { Track } from '../types'

interface RawTrack {
  path: string; format: string; title?: string; artist?: string; album?: string
  album_artist?: string; genre?: string; year?: number; track_number?: number
  disc_number?: number; duration?: number; cover_art?: string; bit_depth?: number
  sample_rate?: number; bitrate?: number; file_size?: number
  replay_gain_track?: number; replay_gain_album?: number
  lyrics?: string; comment?: string; composer?: string
}

function rawToTrack(r: RawTrack): Track {
  return {
    path: r.path, format: r.format as Track['format'],
    title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '',
    albumArtist: r.album_artist ?? '', genre: r.genre ?? '', year: r.year ?? 0,
    trackNumber: r.track_number ?? 0, discNumber: r.disc_number ?? 0,
    duration: r.duration ?? 0, coverArt: r.cover_art,
    sampleRate: r.sample_rate ?? 0, bitrate: r.bitrate ?? 0, fileSize: r.file_size ?? 0,
    replayGainTrack: r.replay_gain_track, replayGainAlbum: r.replay_gain_album,
    lyrics: r.lyrics, comment: r.comment, composer: r.composer,
  }
}

const VARS = ['{title}', '{artist}', '{album}', '{track}', '{disc}', '{year}', '{genre}']

const PREVIEW_TRACK = {
  title: 'Another Brick in the Wall',
  artist: 'Pink Floyd',
  album: 'The Wall',
  trackNumber: 1,
  discNumber: 0,
  year: 1979,
  genre: 'Rock',
}

function PatternInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                   font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                   transition-all duration-200"
      />
    </div>
  )
}

function SleepTimerCountdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, endsAt - Date.now()))
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, endsAt - Date.now())), 1000)
    return () => clearInterval(iv)
  }, [endsAt])
  const m = Math.floor(remaining / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return <span className="text-xs text-accent tabular-nums">{m}:{s.toString().padStart(2, '0')} remaining</span>
}

export default function Settings() {
  const [supportedFormats, setSupportedFormats] = useState<string[]>([])
  const {
    filePattern, folderPattern, setFilePattern, setFolderPattern,
    musicFolder, setMusicFolder, setTracks, isScanning, setScanning,
    crossfadeDuration, setCrossfadeDuration,
    sleepTimerEndsAt, setSleepTimer,
    replayGainMode, setReplayGainMode,
  } = useLibraryStore()

  async function scanFolder(path: string) {
    setScanning(true)
    try {
      const raw = await invoke<RawTrack[]>('scan_folder', { path, skipCover: true })
      setTracks(raw.map(rawToTrack))
      invoke('save_library_cache', { tracks: raw }).catch(() => {})
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  async function handlePickMusicFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Select Music Folder' })
    if (selected && typeof selected === 'string') {
      setMusicFolder(selected)
      await scanFolder(selected)
    }
  }

  async function handleRescan() {
    if (musicFolder) await scanFolder(musicFolder)
  }

  useEffect(() => {
    invoke<string[]>('get_supported_formats').then(setSupportedFormats).catch(console.error)
  }, [])

  const preview = buildPreviewPath(folderPattern, filePattern, PREVIEW_TRACK, 'flac')

  return (
    <div className="px-8 py-8 max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* Music Library */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Music Library</h2>
        <div className="glass-card space-y-3">
          <p className="text-xs text-zinc-500">
            Music folder for the player. Changing it will trigger an automatic rescan.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono truncate text-zinc-400">
              {musicFolder ?? <span className="text-zinc-600">Not set</span>}
            </div>
            {musicFolder && (
              <button
                onClick={() => setMusicFolder('')}
                title="Clear folder"
                className="p-2 text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {musicFolder && (
              <button
                onClick={handleRescan}
                disabled={isScanning}
                title="Rescan folder"
                className="p-2 text-zinc-500 hover:text-zinc-200 border border-white/10 rounded-lg transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={handlePickMusicFolder}
              disabled={isScanning}
              className="flex items-center gap-2 px-3 py-2 text-sm btn-primary shrink-0 disabled:opacity-40"
            >
              <FolderOpen className="w-4 h-4" />
              {musicFolder ? 'Change' : 'Select'}
            </button>
          </div>
          {isScanning && (
            <p className="text-xs text-accent flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Scanning library…
            </p>
          )}
        </div>
      </section>

      {/* Playback */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Playback</h2>
        <div className="glass-card space-y-6">

          {/* Crossfade */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400">Crossfade</label>
              <span className="text-xs text-zinc-500">
                {crossfadeDuration === 0 ? 'Disabled' : `${crossfadeDuration}s`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Smooth fade between tracks (0 = disabled)
            </p>
          </div>

          {/* ReplayGain */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-2">ReplayGain</label>
            <div className="flex gap-2">
              {(['off', 'track', 'album'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setReplayGainMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize ${
                    replayGainMode === mode
                      ? 'bg-accent/20 border-accent/50 text-accent'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                  }`}
                >
                  {mode === 'off' ? 'Off' : mode === 'track' ? 'Track' : 'Album'}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-1.5">
              Normalizes volume using ReplayGain tags embedded in each file
            </p>
          </div>

          {/* Sleep Timer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" />
                Sleep timer
              </label>
              {sleepTimerEndsAt && <SleepTimerCountdown endsAt={sleepTimerEndsAt} />}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  onClick={() => setSleepTimer(min)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    sleepTimerEndsAt
                      ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                  }`}
                >
                  {min} min
                </button>
              ))}
              {sleepTimerEndsAt && (
                <button
                  onClick={() => setSleepTimer(null)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-1.5">
              Automatically stops playback after the selected time
            </p>
          </div>
        </div>
      </section>

      {/* File Naming */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">File Naming</h2>
        <div className="glass-card space-y-4">
          <PatternInput
            label="Folder structure"
            value={folderPattern}
            onChange={setFolderPattern}
          />
          <PatternInput
            label="File name"
            value={filePattern}
            onChange={setFilePattern}
          />

          {/* Variable chips */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-600">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {VARS.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-xs font-mono text-accent"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-1">
            <p className="text-xs text-zinc-600">Preview</p>
            <p className="text-xs font-mono text-zinc-400 bg-white/5 rounded px-3 py-2 break-all">
              {preview}
            </p>
          </div>
        </div>
      </section>

      {/* Supported Formats */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Supported Formats</h2>
        <div className="glass-card">
          <div className="flex flex-wrap gap-2">
            {supportedFormats.length === 0
              ? <p className="text-sm text-zinc-500">Loading…</p>
              : supportedFormats.map((ext) => (
                  <span key={ext} className="format-badge bg-accent/15 text-accent border-accent/30">
                    {ext.toUpperCase()}
                  </span>
                ))
            }
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Additional formats (MP3, AAC, OGG, OPUS, WAV, AIFF) are on the roadmap.
          </p>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">About</h2>
        <div className="glass-card flex items-start gap-3">
          <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <div className="text-sm text-zinc-400 space-y-1">
            <p>Melodix v0.2.0</p>
            <p className="text-zinc-600 text-xs">
              Built with Tauri v2 + React 19 + TypeScript + TailwindCSS v4
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
