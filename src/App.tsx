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
import GlobalSearch from './components/GlobalSearch'
import { useLibraryStore } from './store'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Track } from './types'

interface RawTrack {
  path: string; format: string; title?: string; artist?: string; album?: string
  album_artist?: string; genre?: string; year?: number; track_number?: number
  disc_number?: number; duration?: number; cover_art?: string; bit_depth?: number
  sample_rate?: number; bitrate?: number; file_size?: number
  replay_gain_track?: number; replay_gain_album?: number
  lyrics?: string; comment?: string; composer?: string; file_modified?: number
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
    fileModified: r.file_modified,
  }
}

function AppContent() {
  const { musicFolders, tracks, setTracks, setScanning } = useLibraryStore()
  useKeyboardShortcuts()

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
