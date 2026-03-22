import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { Info, X, RefreshCw, Moon, Plus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { useLibraryStore } from '../store'
import { buildPreviewPath } from '../services/fileOps'
import { RawTrack, rawToTrack } from '../types'
import { THEMES, THEME_CONFIGS, COLOR_VARS, VAR_LABELS } from '../themes'

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
    musicFolders, addMusicFolder, removeMusicFolder, setTracks, isScanning, setScanning,
    crossfadeDuration, setCrossfadeDuration,
    sleepTimerEndsAt, setSleepTimer,
    replayGainMode, setReplayGainMode,
    theme, setTheme,
    themeOverrides, setThemeOverride, resetThemeOverrides,
    performanceMode, setPerformanceMode,
  } = useLibraryStore()

  const [studioOpen, setStudioOpen] = useState(false)

  async function scanAllFolders(folders: string[]) {
    if (folders.length === 0) return
    setScanning(true)
    try {
      const results = await Promise.all(
        folders.map(path => invoke<RawTrack[]>('scan_folder', { path, skipCover: true }))
      )
      const raw = results.flat()
      setTracks(raw.map(rawToTrack))
      invoke('save_library_cache', { tracks: raw }).catch(() => {})
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  async function handleAddFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Add Music Folder' })
    if (selected && typeof selected === 'string' && !musicFolders.includes(selected)) {
      addMusicFolder(selected)
      await scanAllFolders([...musicFolders, selected])
    }
  }

  async function handleRescan() {
    await scanAllFolders(musicFolders)
  }

  useEffect(() => {
    invoke<string[]>('get_supported_formats').then(setSupportedFormats).catch(console.error)
  }, [])

  const preview = buildPreviewPath(folderPattern, filePattern, PREVIEW_TRACK, 'flac')

  return (
    <div className="h-full overflow-y-scroll px-8 py-8 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* Appearance */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Appearance</h2>
        <div className="grid grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative flex flex-col gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-accent/60 bg-accent/10 shadow-[0_0_20px_rgba(0,0,0,0.4)]'
                    : 'border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15'
                }`}
              >
                {/* Color preview */}
                <div
                  className="w-full h-12 rounded-lg overflow-hidden flex"
                  style={{ background: t.preview.bg }}
                >
                  {/* Surface strip */}
                  <div className="w-8 h-full shrink-0" style={{ background: t.preview.surface }} />
                  {/* Content area with accent dot */}
                  <div className="flex-1 flex flex-col justify-between p-1.5">
                    <div className="flex gap-1">
                      <div className="h-1.5 rounded-full flex-1" style={{ background: `${t.preview.accent}80` }} />
                      <div className="h-1.5 rounded-full w-4" style={{ background: `${t.preview.accent}40` }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: t.preview.accent }} />
                      <div className="h-1 rounded-full flex-1" style={{ background: `${t.preview.accent}50` }} />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{t.emoji}</span>
                    <span className={`text-xs font-semibold ${active ? 'text-accent' : 'text-zinc-200'}`}>
                      {t.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-tight">{t.tag}</p>
                </div>

                {/* Active indicator */}
                {active && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Performance mode */}
      <section className="mb-6">
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-200 font-medium">Performance mode</p>
            <p className="text-xs text-zinc-500 mt-0.5">Disables animations, blur and heavy effects for lower-end hardware</p>
          </div>
          <button
            onClick={() => setPerformanceMode(!performanceMode)}
            className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${performanceMode ? 'bg-accent' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${performanceMode ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </section>

      {/* Theme Studio */}
      <section className="mb-6">
        <button
          onClick={() => setStudioOpen(o => !o)}
          className="w-full flex items-center justify-between mb-3 group"
        >
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider group-hover:text-zinc-200 transition-colors">
            Theme Studio
          </h2>
          <div className="flex items-center gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
            <span className="text-xs">{THEMES.find(t => t.id === theme)?.name ?? 'Default'}</span>
            {studioOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {studioOpen && (
          <div className="glass-card space-y-4">
            {/* Palette */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-600">Edit colors for <span className="text-zinc-400">{THEMES.find(t => t.id === theme)?.name}</span></p>
                  {themeOverrides[theme] && Object.keys(themeOverrides[theme]).length > 0 && (
                    <button
                      onClick={() => resetThemeOverrides(theme)}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset all
                    </button>
                  )}
                </div>

                {COLOR_VARS.map((cssVar) => {
                  const base = THEME_CONFIGS[theme] ?? THEME_CONFIGS['default']
                  const defaultVal = base[cssVar] ?? '#000000'
                  const currentVal = themeOverrides[theme]?.[cssVar] ?? defaultVal
                  const isOverridden = !!themeOverrides[theme]?.[cssVar]
                  const label = VAR_LABELS[cssVar] ?? cssVar

                  return (
                    <div key={cssVar} className="flex items-center gap-3">
                      {/* Swatch preview */}
                      <div
                        className="w-7 h-7 shrink-0 border border-white/10"
                        style={{ background: currentVal, borderRadius: 'var(--radius-sm)' }}
                      />
                      {/* Label */}
                      <span className="flex-1 text-xs text-zinc-400">{label}</span>
                      {/* Hex value */}
                      <code className="text-[10px] text-zinc-600 w-[5.5rem] text-right font-mono truncate">
                        {currentVal}
                      </code>
                      {/* Color picker */}
                      <label className="relative cursor-pointer">
                        <div
                          className="w-7 h-7 border-2 border-white/20 hover:border-white/40 transition-colors cursor-pointer overflow-hidden"
                          style={{ background: currentVal, borderRadius: 'var(--radius-sm)' }}
                        />
                        <input
                          type="color"
                          value={currentVal.startsWith('#') ? currentVal : '#000000'}
                          onChange={e => setThemeOverride(theme, cssVar, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                      {/* Reset individual */}
                      {isOverridden && (
                        <button
                          onClick={() => {
                            const prev = themeOverrides[theme] ?? {}
                            const next = { ...prev }
                            delete next[cssVar]
                            Object.keys(next).length > 0
                              ? setThemeOverride(theme, cssVar, next[cssVar])
                              : resetThemeOverrides(theme)
                          }}
                          title="Reset to default"
                          className="text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      {!isOverridden && <div className="w-3" />}
                    </div>
                  )
                })}

                {/* Font preview */}
                <div className="pt-2 border-t border-white/6">
                  <p className="text-[10px] text-zinc-600 mb-1.5 uppercase tracking-wider">Typography</p>
                  <div className="px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <p className="text-xs text-zinc-500 mb-0.5 font-mono">{THEMES.find(t => t.id === theme)?.font}</p>
                    <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                      Listening: Music Through the Ages
                    </p>
                  </div>
                </div>
            </div>
          </div>
        )}
      </section>


      {/* Music Library — full width */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Music Library</h2>
        <div className="glass-card space-y-3">
          <p className="text-xs text-zinc-500">
            Add one or more folders. All will be scanned and merged into your library.
          </p>

          {musicFolders.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {musicFolders.map(folder => (
                <div key={folder} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-mono truncate text-zinc-400">
                    {folder}
                  </div>
                  <button
                    onClick={() => removeMusicFolder(folder)}
                    disabled={isScanning}
                    title="Remove folder"
                    className="p-2 text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all disabled:opacity-40 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddFolder}
              disabled={isScanning}
              className="flex items-center gap-2 px-3 py-2 text-sm btn-primary shrink-0 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              Add folder
            </button>
            {musicFolders.length > 0 && (
              <button
                onClick={handleRescan}
                disabled={isScanning}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-white/10 rounded-lg transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                Rescan
              </button>
            )}
            {isScanning && (
              <p className="text-xs text-accent flex items-center gap-1.5 ml-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Scanning…
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-6">

        {/* LEFT col */}
        <div className="flex flex-col gap-6">

          {/* Playback */}
          <section>
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
                  type="range" min={0} max={12} step={1}
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <p className="text-xs text-zinc-600 mt-1.5">Smooth fade between tracks (0 = disabled)</p>
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
                <p className="text-xs text-zinc-600 mt-1.5">Normalizes volume using ReplayGain tags</p>
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
                      className="px-3 py-1.5 text-xs rounded-lg border bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all"
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
                <p className="text-xs text-zinc-600 mt-1.5">Stops playback after the selected time</p>
              </div>
            </div>
          </section>

          {/* Supported Formats */}
          <section>
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
        </div>

        {/* RIGHT col */}
        <div className="flex flex-col gap-6">

          {/* File Naming */}
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">File Naming</h2>
            <div className="glass-card space-y-4">
              <PatternInput label="Folder structure" value={folderPattern} onChange={setFolderPattern} />
              <PatternInput label="File name" value={filePattern} onChange={setFilePattern} />
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-600">Available variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARS.map((v) => (
                    <span key={v} className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-xs font-mono text-accent">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-600">Preview</p>
                <p className="text-xs font-mono text-zinc-400 bg-white/5 rounded px-3 py-2 break-all">{preview}</p>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">About</h2>
            <div className="glass-card flex items-start gap-3">
              <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div className="text-sm text-zinc-400 space-y-1">
                <p>Melodix v0.2.0</p>
                <p className="text-zinc-600 text-xs">Built with Tauri v2 + React 19 + TypeScript + TailwindCSS v4</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
