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
import Player from './components/Player'
import NowPlaying from './components/NowPlaying'
import { useLibraryStore } from './store'
import { Track } from './types'

interface RawTrack {
  path: string; format: string; title?: string; artist?: string; album?: string
  album_artist?: string; genre?: string; year?: number; track_number?: number
  disc_number?: number; duration?: number; cover_art?: string; bit_depth?: number
  sample_rate?: number; bitrate?: number; file_size?: number
}

function rawToTrack(r: RawTrack): Track {
  return {
    path: r.path, format: r.format as Track['format'],
    title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '',
    albumArtist: r.album_artist ?? '', genre: r.genre ?? '', year: r.year ?? 0,
    trackNumber: r.track_number ?? 0, discNumber: r.disc_number ?? 0,
    duration: r.duration ?? 0, coverArt: r.cover_art,
    sampleRate: r.sample_rate ?? 0, bitrate: r.bitrate ?? 0, fileSize: r.file_size ?? 0,
  }
}

function AppContent() {
  const { musicFolder, tracks, setTracks, setScanning } = useLibraryStore()

  // Auto-scan music folder on startup
  useEffect(() => {
    if (musicFolder && tracks.length === 0) {
      setScanning(true)
      invoke<RawTrack[]>('scan_folder', { path: musicFolder, skipCover: true })
        .then((raw) => setTracks(raw.map(rawToTrack)))
        .catch(console.error)
        .finally(() => setScanning(false))
    }
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
          </Routes>
        </div>
      </div>
      <Player />
      <NowPlaying />
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
