import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import LibraryPage from './pages/Library'
import PlayerPage from './pages/PlayerPage'
import Settings from './pages/Settings'
import LikesPage from './pages/Likes'
import PlaylistPage from './pages/PlaylistPage'
import StatsPage from './pages/StatsPage'
import GenrePage from './pages/GenrePage'
import Player from './components/Player'
import NowPlaying from './components/NowPlaying'
import QueuePanel from './components/QueuePanel'
import EqPanel from './components/EqPanel'
import EffectsPanel from './components/EffectsPanel'
import GlobalSearch from './components/GlobalSearch'
import { useLibraryStore } from './store'
import { THEME_CONFIGS } from './themes'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { RawTrack, rawToTrack } from './types'

function AppContent() {
  const { musicFolders, tracks, setTracks, setScanning, theme, themeOverrides, performanceMode } = useLibraryStore()
  useKeyboardShortcuts()

  useEffect(() => {
    const el = document.documentElement
    // Keep data-theme attribute for structural CSS overrides (hover effects, borders, etc.)
    if (theme === 'default') el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', theme)

    const base = THEME_CONFIGS[theme] ?? THEME_CONFIGS['default']
    Object.entries(base).forEach(([k, v]) => el.style.setProperty(k, v))

    const overrides = themeOverrides[theme] ?? {}
    Object.entries(overrides).forEach(([k, v]) => el.style.setProperty(k, v))
  }, [theme, themeOverrides])

  useEffect(() => {
    if (performanceMode) document.documentElement.setAttribute('data-perf', '')
    else document.documentElement.removeAttribute('data-perf')
  }, [performanceMode])

  // On startup: load disk cache instantly, then rescan in background to pick up changes
  useEffect(() => {
    if (musicFolders.length === 0) return

    async function init() {
      // 1. Load cache immediately so the UI is usable right away
      try {
        const cached = await invoke<RawTrack[] | null>('load_library_cache')
        if (cached && cached.length > 0) setTracks(cached.map(rawToTrack))
      } catch { /* no cache yet */ }

      // 2. Rescan all folders in background to pick up new/removed files
      setScanning(true)
      try {
        const results = await Promise.all(
          musicFolders.map(path => invoke<RawTrack[]>('scan_folder', { path, skipCover: true }))
        )
        const raw = results.flat()
        setTracks(raw.map(rawToTrack))
        invoke('save_library_cache', { tracks: raw }).catch(() => {})
      } catch (err) {
        console.error('Startup scan failed:', err)
      } finally {
        setScanning(false)
      }
    }

    if (tracks.length === 0) init()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="app-layout flex-1 min-h-0">
        <Sidebar />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/player" element={<PlayerPage standalone />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/likes" element={<LikesPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/albums" element={<PlayerPage defaultTab="albums" standalone />} />
            <Route path="/artists" element={<PlayerPage defaultTab="artists" standalone />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/genres" element={<GenrePage />} />
          </Routes>
        </div>
      </div>
      <Player />
      <NowPlaying />
      <QueuePanel />
      <EqPanel />
      <EffectsPanel />
      <GlobalSearch />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
