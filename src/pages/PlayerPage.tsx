import { useState, useEffect, useMemo, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Play, Pause, Music2, Search, RefreshCw, Shuffle,
  LayoutGrid, List, ChevronLeft, Disc3, Mic2,
} from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'
import AddToPlaylist from '../components/AddToPlaylist'
import LazyCover from '../components/LazyCover'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'songs' | 'albums' | 'artists'

interface Album {
  name: string
  artist: string
  firstTrackPath: string
  tracks: Track[]
}

interface Artist {
  name: string
  firstTrackPath: string
  tracks: Track[]
}

// ── Raw track parsing (same as App.tsx) ───────────────────────────────────────

interface RawTrack {
  path: string; format: string; title?: string; artist?: string; album?: string
  album_artist?: string; genre?: string; year?: number; track_number?: number
  disc_number?: number; duration?: number; cover_art?: string
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

function formatDuration(s: number): string {
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Song row ──────────────────────────────────────────────────────────────────

function SongRow({
  track, isActive, isPlaying, onPlay,
}: {
  track: Track; isActive: boolean; isPlaying: boolean
  onPlay: () => void
}) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive ? 'bg-accent/15' : 'hover:bg-white/5'
      }`}
    >
      {/* Cover / index */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
        <LazyCover
          path={track.path}
          coverArt={track.coverArt}
          className="absolute inset-0 w-full h-full object-cover"
          iconSize={16}
        />
        {/* Play overlay on hover or active */}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity
          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isActive && isPlaying
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-zinc-200'}`}>
          {track.title || track.path.split('/').pop()}
        </p>
        <p className="text-xs text-zinc-500 truncate">{track.artist || 'Unknown Artist'}</p>
      </div>

      {/* Duration */}
      {track.duration > 0 && (
        <span className="text-xs text-zinc-600 tabular-nums shrink-0 mr-1">
          {formatDuration(track.duration)}
        </span>
      )}

      <AddToPlaylist trackPath={track.path} />
    </div>
  )
}

// ── Album card (grid) ─────────────────────────────────────────────────────────

function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden aspect-square group cursor-pointer"
    >
      {/* Cover art */}
      <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
        <Disc3 className="w-12 h-12 text-zinc-700" />
      </div>
      <LazyCover
        path={album.firstTrackPath}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      {/* Play button on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
          <Play className="w-5 h-5 text-white ml-0.5" />
        </div>
      </div>
      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-semibold text-white truncate leading-tight">{album.name || 'Unknown Album'}</p>
        <p className="text-xs text-white/60 truncate mt-0.5">{album.artist}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{album.tracks.length} songs</p>
      </div>
    </button>
  )
}

// ── Artist row ────────────────────────────────────────────────────────────────

function ArtistRow({ artist, onClick }: { artist: Artist; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/5 transition-all w-full text-left group cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
        <Mic2 className="w-6 h-6 text-zinc-600" />
        <LazyCover
          path={artist.firstTrackPath}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
          {artist.name || 'Unknown Artist'}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{artist.tracks.length} songs</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ── Sub-view header (back button + title) ─────────────────────────────────────

function SubHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 pb-4 shrink-0">
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-zinc-300" />
      </button>
      <div className="min-w-0">
        <p className="text-base font-bold text-zinc-100 truncate">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-600 py-16">
      <Music2 className="w-12 h-12 opacity-20" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerPage({ defaultTab = 'songs', standalone = false }: { defaultTab?: Tab; standalone?: boolean }) {
  const {
    musicFolder, tracks, isScanning, setTracks, setScanning,
    playerTrack, isPlaying, playTrack, setIsPlaying,
    shuffleOn, toggleShuffle,
  } = useLibraryStore()

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [drillAlbum, setDrillAlbum] = useState<string | null>(null)
  const [drillArtist, setDrillArtist] = useState<string | null>(null)

  // ── Scan ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (musicFolder && tracks.length === 0) scanFolder(musicFolder)
  }, [])

  async function scanFolder(folder: string) {
    setScanning(true)
    try {
      const raw: RawTrack[] = await invoke('scan_folder', { path: folder, skipCover: true })
      setTracks(raw.map(rawToTrack))
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search) return tracks
    const q = search.toLowerCase()
    return tracks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    )
  }, [tracks, search])

  // ── Grouping ──────────────────────────────────────────────────────────────

  const albums = useMemo<Album[]>(() => {
    const map = new Map<string, Album>()
    for (const t of filtered) {
      const key = t.album || '—'
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          artist: t.albumArtist || t.artist || 'Unknown',
          firstTrackPath: t.path,
          tracks: [],
        })
      }
      map.get(key)!.tracks.push(t)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  const artists = useMemo<Artist[]>(() => {
    const map = new Map<string, Artist>()
    for (const t of filtered) {
      const key = t.artist || 'Unknown Artist'
      if (!map.has(key)) {
        map.set(key, { name: key, firstTrackPath: t.path, tracks: [] })
      }
      map.get(key)!.tracks.push(t)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  // ── Playback helpers ──────────────────────────────────────────────────────

  const handlePlayTrack = useCallback((track: Track, queue: Track[]) => {
    if (playerTrack?.path === track.path) {
      setIsPlaying(!isPlaying)
    } else {
      playTrack(track, queue)
    }
  }, [playerTrack, isPlaying])

  function handleShuffleAll() {
    if (filtered.length === 0) return
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
    if (!shuffleOn) toggleShuffle()
  }

  // ── Drill-down helpers ────────────────────────────────────────────────────

  function openAlbum(name: string) {
    setDrillAlbum(name)
    setDrillArtist(null)
  }
  function openArtist(name: string) {
    setDrillArtist(name)
    setDrillAlbum(null)
  }
  function closeDrill() {
    setDrillAlbum(null)
    setDrillArtist(null)
  }

  // Sync tab when navigating between sidebar routes (/player, /albums, /artists)
  useEffect(() => { setTab(defaultTab); closeDrill() }, [defaultTab])

  const drillTracks = useMemo<Track[]>(() => {
    if (drillAlbum) return filtered.filter((t) => (t.album || '—') === drillAlbum)
      .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
    if (drillArtist) return filtered.filter((t) => t.artist === drillArtist)
    return []
  }, [drillAlbum, drillArtist, filtered])

  const inDrill = drillAlbum !== null || drillArtist !== null

  // ── No folder state ───────────────────────────────────────────────────────

  if (!musicFolder) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Music2 className="w-20 h-20 text-zinc-700" />
        <div className="text-center">
          <p className="text-base font-semibold text-zinc-300">No music folder configured</p>
          <p className="text-sm text-zinc-600 mt-1">Go to Settings to select your music folder</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-5 pb-3">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-zinc-100">
            {standalone ? (defaultTab === 'albums' ? 'Albums' : defaultTab === 'artists' ? 'Artists' : 'Songs') : 'Library'}
          </h1>
          <button
            onClick={() => musicFolder && scanFolder(musicFolder)}
            disabled={isScanning}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs — hidden when this is a standalone albums/artists route */}
        {!standalone && (
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
            {(['songs', 'albums', 'artists'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); closeDrill() }}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                    : 'bg-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/12'
                }`}
              >
                {t === 'songs' ? 'Songs' : t === 'albums' ? 'Albums' : 'Artists'}
              </button>
            ))}
          </div>
        )}

        {/* Controls row */}
        {!inDrill && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleShuffleAll}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                shuffleOn
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/12'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-200
                           placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 w-36 transition-all
                           focus:w-52"
              />
            </div>

            {/* View toggle (only for albums) */}
            {tab === 'albums' && (
              <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/15 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/15 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">

        {/* Drill-down: Album or Artist song list */}
        {inDrill && (
          <div className="flex flex-col h-full">
            <SubHeader
              title={drillAlbum ?? drillArtist ?? ''}
              subtitle={`${drillTracks.length} songs`}
              onBack={closeDrill}
            />
            {drillTracks.length === 0
              ? <Empty message="No songs found" />
              : drillTracks.map((track) => (
                <SongRow
                  key={track.path}
                  track={track}
                  isActive={playerTrack?.path === track.path}
                  isPlaying={playerTrack?.path === track.path && isPlaying}
                  onPlay={() => handlePlayTrack(track, drillTracks)}
                />
              ))
            }
          </div>
        )}

        {/* Songs tab */}
        {!inDrill && tab === 'songs' && (
          filtered.length === 0
            ? <Empty message={isScanning ? 'Scanning…' : 'No songs found'} />
            : filtered.map((track) => (
              <SongRow
                key={track.path}
                track={track}
                isActive={playerTrack?.path === track.path}
                isPlaying={playerTrack?.path === track.path && isPlaying}
                onPlay={() => handlePlayTrack(track, filtered)}
              />
            ))
        )}

        {/* Albums tab */}
        {!inDrill && tab === 'albums' && (
          albums.length === 0
            ? <Empty message={isScanning ? 'Scanning…' : 'No albums found'} />
            : viewMode === 'grid'
              ? (
                <div className="grid grid-cols-2 gap-3">
                  {albums.map((album) => (
                    <AlbumCard
                      key={album.name}
                      album={album}
                      onClick={() => openAlbum(album.name)}
                    />
                  ))}
                </div>
              )
              : (
                <div className="flex flex-col gap-1">
                  {albums.map((album) => (
                    <button
                      key={album.name}
                      onClick={() => openAlbum(album.name)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left w-full group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-zinc-600" />
                        <LazyCover trackPath={album.firstTrackPath} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white">{album.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{album.artist} · {album.tracks.length} songs</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180 shrink-0 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )
        )}

        {/* Artists tab */}
        {!inDrill && tab === 'artists' && (
          artists.length === 0
            ? <Empty message={isScanning ? 'Scanning…' : 'No artists found'} />
            : artists.map((artist) => (
              <ArtistRow
                key={artist.name}
                artist={artist}
                onClick={() => openArtist(artist.name)}
              />
            ))
        )}
      </div>
    </div>
  )
}
