import { FolderOpen, RefreshCw, Search } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { useLibraryStore } from '../store'
import { Track } from '../types'

interface RawTrack {
  path: string
  format: string
  title?: string
  artist?: string
  album?: string
  album_artist?: string
  genre?: string
  year?: number
  track_number?: number
  disc_number?: number
  duration?: number
  cover_art?: string
  bit_depth?: number
  sample_rate?: number
  bitrate?: number
  file_size?: number
  lyrics?: string
  comment?: string
  composer?: string
}

function rawToTrack(r: RawTrack): Track {
  return {
    path: r.path,
    format: r.format as Track['format'],
    title: r.title ?? '',
    artist: r.artist ?? '',
    album: r.album ?? '',
    albumArtist: r.album_artist ?? '',
    genre: r.genre ?? '',
    year: r.year ?? 0,
    trackNumber: r.track_number ?? 0,
    discNumber: r.disc_number ?? 0,
    duration: r.duration ?? 0,
    coverArt: r.cover_art,
    bitDepth: r.bit_depth,
    sampleRate: r.sample_rate ?? 0,
    bitrate: r.bitrate ?? 0,
    fileSize: r.file_size ?? 0,
    lyrics: r.lyrics,
    comment: r.comment,
    composer: r.composer,
  }
}

export default function Toolbar() {
  const { isScanning, searchQuery, setTracks, setScanning, setSearchQuery } = useLibraryStore()

  async function handleScanFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Select Music Folder' })
    if (!selected || typeof selected !== 'string') return

    setScanning(true)
    try {
      const raw: RawTrack[] = await invoke('scan_folder', { path: selected })
      setTracks(raw.map(rawToTrack))
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  return (
    <header className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-surface/80 backdrop-blur-sm shrink-0">
      <button
        className="btn-primary flex items-center gap-2 text-sm"
        onClick={handleScanFolder}
        disabled={isScanning}
      >
        {isScanning ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <FolderOpen className="w-4 h-4" />
        )}
        {isScanning ? 'Scanning…' : 'Open Folder'}
      </button>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search library…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                     placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                     transition-all duration-200"
        />
      </div>
    </header>
  )
}
