import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Play, Pause, Music2, Search, RefreshCw, Shuffle, Check,
  LayoutGrid, List, ChevronLeft, Disc3, Mic2, ListPlus, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLibraryStore } from '../store'
import { Track, RawTrack, rawToTrack } from '../types'
import AddToPlaylist from '../components/AddToPlaylist'
import LazyCover from '../components/LazyCover'
import { useTheme, useThemeLabels } from '../hooks/useTheme'
import { formatDuration } from '../utils'

type Tab = 'songs' | 'albums' | 'artists'
type SortKey = 'title' | 'artist' | 'album' | 'duration'
type SortDir = 'asc' | 'desc'

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

// Song row

function SongRow({
  track, isActive, isPlaying, onPlay,
}: {
  track: Track; isActive: boolean; isPlaying: boolean
  onPlay: () => void
}) {
  const addToQueue = useLibraryStore(s => s.addToQueue)
  const inQueue = useLibraryStore(s => s.playerQueue.some(t => t.path === track.path))
  return (
    <div
      onClick={onPlay}
      className={`song-row group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer duration-150 ${
        isActive ? 'active bg-accent/15' : 'hover:bg-white/5'
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

      <button
        onClick={(e) => { e.stopPropagation(); addToQueue(track) }}
        disabled={inQueue}
        title={inQueue ? 'Already in queue' : 'Add to queue'}
        className={`shrink-0 transition-colors opacity-0 group-hover:opacity-100 p-1 ${inQueue ? 'text-accent cursor-default' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {inQueue ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
      </button>
      <AddToPlaylist trackPath={track.path} />
    </div>
  )
}

// Album card (grid)

function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="album-grid-card relative rounded-2xl overflow-hidden aspect-square group cursor-pointer transition-all duration-200"
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

// Artist row

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

// Album detail header

function AlbumHeader({ album, onBack, onPlay, onShuffle }: {
  album: Album; onBack: () => void
  onPlay: () => void; onShuffle: () => void
}) {
  const L = useThemeLabels()
  const year = album.tracks.find(t => t.year)?.year
  return (
    <div className="shrink-0 bg-gradient-to-b from-zinc-800/60 to-transparent px-5 pt-4 pb-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-4"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {L.navAlbums}
      </button>
      <div className="flex items-end gap-4">
        {/* Cover */}
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 shadow-2xl bg-white/5 relative flex items-center justify-center">
          <Disc3 className="w-10 h-10 text-zinc-700 absolute" />
          <LazyCover path={album.firstTrackPath} className="absolute inset-0 w-full h-full" />
        </div>
        {/* Info */}
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Album</p>
          <h2 className="text-xl font-bold text-white truncate leading-tight">{album.name || 'Unknown Album'}</h2>
          <p className="text-sm text-zinc-400 truncate mt-0.5">{album.artist}</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}
            {year ? ` · ${year}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onPlay}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          <Play className="w-4 h-4 ml-0.5" /> Play
        </button>
        <button
          onClick={onShuffle}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
      </div>
    </div>
  )
}

// Artist detail header

function ArtistHeader({ artist, onBack, onPlay, onShuffle }: {
  artist: Artist; onBack: () => void
  onPlay: () => void; onShuffle: () => void
}) {
  const L = useThemeLabels()
  return (
    <div className="shrink-0 bg-gradient-to-b from-zinc-800/60 to-transparent px-5 pt-4 pb-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-4"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {L.navArtists}
      </button>
      <div className="flex items-end gap-4">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 shadow-2xl bg-white/5 relative flex items-center justify-center">
          <Mic2 className="w-10 h-10 text-zinc-700 absolute" />
          <LazyCover path={artist.firstTrackPath} className="absolute inset-0 w-full h-full" />
        </div>
        {/* Info */}
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Artist</p>
          <h2 className="text-xl font-bold text-white truncate leading-tight">{artist.name || 'Unknown Artist'}</h2>
          <p className="text-xs text-zinc-600 mt-1">
            {artist.tracks.length} {artist.tracks.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onPlay}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          <Play className="w-4 h-4 ml-0.5" /> Play
        </button>
        <button
          onClick={onShuffle}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
      </div>
    </div>
  )
}

// Empty state

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-600 py-16">
      <Music2 className="w-12 h-12 opacity-20" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}

// Virtualized song list

const SONG_ROW_HEIGHT = 60

function VirtualSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SONG_ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto px-3">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const track = tracks[item.index]
          return (
            <div
              key={track.path}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: item.size,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <SongRow
                track={track}
                isActive={playerTrack?.path === track.path}
                isPlaying={playerTrack?.path === track.path && isPlaying}
                onPlay={() => onPlay(track, tracks)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Blame theme: hex number helpers

function toHex(n: number): string {
  return n.toString(16).toUpperCase().padStart(4, '0')
}

function BlameNetscanner({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto" style={{ fontFamily: '"Space Mono", monospace', background: '#020204' }}>

      {/* Netsphere header */}
      <div className="sticky top-0 z-10 px-4 py-2 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(78,173,200,0.18)',
          background: '#020204',
        }}>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: 'rgba(78,173,200,0.5)' }}>
            NETSPHERE DIRECTORY
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(78,173,200,0.25)' }}>
            /STRATA/AUDIO/{tracks.length.toString(16).toUpperCase().padStart(4,'0')} RECORDS
          </span>
        </div>
        <span className="text-[9px] tabular-nums" style={{ color: 'rgba(78,173,200,0.25)' }}>
          {tracks.length} NODES
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-4 px-4 py-1.5"
        style={{
          borderBottom: '1px solid rgba(78,173,200,0.08)',
          background: 'rgba(78,173,200,0.02)',
        }}>
        <span className="w-14 shrink-0 text-[8px] tracking-widest uppercase" style={{ color: 'rgba(78,173,200,0.35)' }}>ADDR</span>
        <span className="flex-1 text-[8px] tracking-widest uppercase" style={{ color: 'rgba(78,173,200,0.35)' }}>SIGNAL_PATH</span>
        <span className="w-32 shrink-0 hidden sm:block text-[8px] tracking-widest uppercase" style={{ color: 'rgba(78,173,200,0.35)' }}>ORIGIN</span>
        <span className="w-12 shrink-0 text-right text-[8px] tracking-widest uppercase" style={{ color: 'rgba(78,173,200,0.35)' }}>CYCLE</span>
      </div>

      {/* Rows */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          const addr = `0x${toHex(item.index)}`

          return (
            <div
              key={track.path}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: item.size,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-4 px-4 h-full cursor-pointer group"
                style={{
                  borderLeft: isActive
                    ? '3px solid #4EADC8'
                    : '3px solid transparent',
                  borderBottom: '1px solid rgba(78,173,200,0.04)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(78,173,200,0.10) 0%, rgba(78,173,200,0.02) 40%, transparent 100%)'
                    : undefined,
                  transition: 'background 120ms ease, border-left-color 120ms ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(78,173,200,0.04)'
                    el.style.borderLeftColor = 'rgba(78,173,200,0.25)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = ''
                    el.style.borderLeftColor = 'transparent'
                  }
                }}
              >
                {/* Address */}
                <span className="w-14 shrink-0 text-[10px] tabular-nums font-bold"
                  style={{
                    color: isActive ? '#4EADC8' : 'rgba(78,173,200,0.30)',
                    textShadow: isActive ? '0 0 8px rgba(78,173,200,0.60)' : undefined,
                  }}>
                  {isActive ? (isPlaying ? '▶ LIVE' : '‖ HALT') : addr}
                </span>

                {/* Signal path (title) */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate"
                    style={{
                      color: isActive ? '#8DD4EA' : '#B4CDD8',
                      letterSpacing: '0.04em',
                      textShadow: isActive ? '0 0 12px rgba(78,173,200,0.40)' : undefined,
                    }}>
                    {(track.title || track.path.split('/').pop() || '').toUpperCase()}
                  </p>
                  {track.album && (
                    <p className="text-[9px] truncate mt-0.5" style={{ color: 'rgba(78,173,200,0.28)', letterSpacing: '0.06em' }}>
                      //{track.album.toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Origin (artist) */}
                <span className="w-32 shrink-0 hidden sm:block text-[10px] truncate"
                  style={{ color: isActive ? 'rgba(78,173,200,0.65)' : 'rgba(78,173,200,0.28)', letterSpacing: '0.04em' }}>
                  {(track.artist || '---').toUpperCase()}
                </span>

                {/* Cycle (duration) */}
                <span className="w-12 shrink-0 text-right text-[10px] tabular-nums"
                  style={{ color: isActive ? 'rgba(78,173,200,0.70)' : 'rgba(78,173,200,0.25)' }}>
                  {track.duration > 0 ? formatDuration(track.duration) : '--:--'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Obsidian theme: song list

// Roman numeral converter (I–XII then fallback to arabic)
function toRoman(n: number): string {
  if (n <= 0 || n > 3999) return String(n)
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let result = ''
  let num = n
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i] }
  }
  return result
}

function GrimoireSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto"
      style={{ background: '#060308', fontFamily: '"Cinzel",Georgia,serif' }}>

      {/* Grimoire header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(6,3,8,0.97)', borderBottom: '1px solid rgba(120,30,90,0.22)' }}>
        <div className="flex items-center gap-4">
          <span className="text-[8px] tracking-[0.28em] uppercase" style={{ color: 'rgba(155,27,58,0.55)' }}>
            ✦ Liber Musicae ✦
          </span>
          <span className="text-[8px] tracking-widest" style={{ color: 'rgba(120,30,90,0.40)' }}>
            {tracks.length} Souls Recorded
          </span>
        </div>
        <span className="text-[8px] tracking-[0.20em] uppercase" style={{ color: 'rgba(155,27,58,0.35)' }}>
          Anno Domini MMXXV
        </span>
      </div>

      {/* Ornamental divider */}
      <div className="flex items-center gap-2 px-6 py-2" style={{ borderBottom: '1px solid rgba(120,30,90,0.12)' }}>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,27,58,0.25), transparent)' }} />
        <span className="text-[10px]" style={{ color: 'rgba(155,27,58,0.30)' }}>✦</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,27,58,0.25), transparent)' }} />
      </div>

      {/* Soul entries */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          const roman = toRoman(item.index + 1)

          return (
            <div
              key={track.path}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: item.size, transform: `translateY(${item.start}px)` }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-4 px-6 h-full cursor-pointer"
                style={{
                  borderBottom: isActive
                    ? '1px solid rgba(155,27,58,0.25)'
                    : '1px solid rgba(120,30,90,0.07)',
                  background: isActive
                    ? 'radial-gradient(ellipse at left, rgba(155,27,58,0.12) 0%, transparent 70%)'
                    : undefined,
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(90,20,80,0.08)'
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                {/* Roman numeral */}
                <div className="w-10 shrink-0 text-right">
                  {isActive ? (
                    <span className="text-xs" style={{ color: '#9B1B3A', textShadow: '0 0 10px rgba(155,27,58,0.5)' }}>
                      {isPlaying ? '♪' : '‖'}
                    </span>
                  ) : (
                    <span className="text-[10px] tabular-nums" style={{ color: 'rgba(120,30,90,0.40)' }}>
                      {roman}
                    </span>
                  )}
                </div>

                {/* Thin ornamental separator */}
                <div className="w-px h-8 shrink-0" style={{ background: isActive ? 'rgba(155,27,58,0.35)' : 'rgba(120,30,90,0.15)' }} />

                {/* Title + album */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate tracking-widest"
                    style={{
                      color: isActive ? '#C0B0D0' : '#8A7A9A',
                      textShadow: isActive ? '0 0 12px rgba(155,27,58,0.25)' : undefined,
                      letterSpacing: '0.10em',
                    }}>
                    {(track.title || track.path.split('/').pop() || '').toUpperCase()}
                  </p>
                  {track.album && (
                    <p className="text-[9px] truncate mt-0.5 tracking-widest" style={{ color: 'rgba(120,30,90,0.40)', letterSpacing: '0.12em' }}>
                      {track.album.toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Artist */}
                <span className="w-32 shrink-0 hidden sm:block text-[10px] truncate tracking-wider"
                  style={{ color: isActive ? 'rgba(192,176,208,0.55)' : 'rgba(120,30,90,0.35)', letterSpacing: '0.08em' }}>
                  {(track.artist || '—').toUpperCase()}
                </span>

                {/* Duration */}
                <span className="w-10 shrink-0 text-right text-[10px] tabular-nums"
                  style={{ color: isActive ? 'rgba(155,27,58,0.75)' : 'rgba(120,30,90,0.28)', fontVariantNumeric: 'tabular-nums' }}>
                  {track.duration > 0 ? formatDuration(track.duration) : '—'}
                </span>
              </div>
            </div>
          )
        })}

        {/* Closing ornament at end */}
        <div className="flex items-center justify-center gap-3 py-6"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div className="flex-1 h-px mx-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,27,58,0.18), transparent)' }} />
          <span className="text-xs" style={{ color: 'rgba(155,27,58,0.22)' }}>✦ Finis ✦</span>
          <div className="flex-1 h-px mx-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,27,58,0.18), transparent)' }} />
        </div>
      </div>
    </div>
  )
}

// Military theme: song list

function TacticalSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto" style={{ background: '#040C03', fontFamily: '"Rajdhani",system-ui,sans-serif' }}>

      {/* Mission header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2"
        style={{ background: '#040C03', borderBottom: '1px solid rgba(100,130,50,0.20)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold tracking-[0.20em] uppercase" style={{ color: 'rgba(100,130,50,0.60)' }}>
            MISSION DOSSIER
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(100,130,50,0.30)' }}>
            ▸ {tracks.length} OBJECTIVES LOADED
          </span>
        </div>
        <span className="text-[9px] tabular-nums font-bold tracking-wider" style={{ color: 'rgba(139,32,32,0.50)' }}>
          ◆ ACTIVE
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-3 px-4 py-1.5"
        style={{ borderBottom: '1px solid rgba(100,130,50,0.08)', background: 'rgba(80,100,40,0.05)' }}>
        <span className="w-14 shrink-0 text-[8px] tracking-widest uppercase" style={{ color: 'rgba(100,130,50,0.40)' }}>ID</span>
        <span className="flex-1 text-[8px] tracking-widest uppercase" style={{ color: 'rgba(100,130,50,0.40)' }}>OBJECTIVE</span>
        <span className="w-28 shrink-0 hidden sm:block text-[8px] tracking-widest uppercase" style={{ color: 'rgba(100,130,50,0.40)' }}>OPERATIVE</span>
        <span className="w-12 shrink-0 text-right text-[8px] tracking-widest uppercase" style={{ color: 'rgba(100,130,50,0.40)' }}>DURATION</span>
      </div>

      {/* Mission rows */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          const missionId = `OBJ-${String(item.index + 1).padStart(3, '0')}`

          return (
            <div
              key={track.path}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: item.size, transform: `translateY(${item.start}px)` }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-3 px-4 h-full cursor-pointer"
                style={{
                  borderLeft: isActive ? '3px solid #8B2020' : '3px solid transparent',
                  borderBottom: '1px solid rgba(100,130,50,0.05)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(139,32,32,0.10) 0%, rgba(139,32,32,0.03) 40%, transparent 100%)'
                    : undefined,
                  transition: 'background 150ms ease, border-left-color 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(80,100,40,0.07)'
                    ;(e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(139,32,32,0.35)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = ''
                    ;(e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'
                  }
                }}
              >
                {/* Mission ID */}
                <div className="w-14 shrink-0">
                  {isActive ? (
                    <span className="text-[10px] font-bold" style={{ color: '#8B2020', textShadow: '0 0 8px rgba(139,32,32,0.5)' }}>
                      {isPlaying ? '► EXEC' : '‖ HALT'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: 'rgba(100,130,50,0.40)' }}>
                      {missionId}
                    </span>
                  )}
                </div>

                {/* Objective / title */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate tracking-wide"
                    style={{
                      color: isActive ? '#D4C8A0' : '#B0A880',
                      textShadow: isActive ? '0 0 10px rgba(139,32,32,0.30)' : undefined,
                    }}>
                    {(track.title || track.path.split('/').pop() || '').toUpperCase()}
                  </p>
                  {track.album && (
                    <p className="text-[9px] truncate mt-0.5 tracking-widest" style={{ color: 'rgba(100,130,50,0.35)' }}>
                      {track.album.toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Operative / artist */}
                <span className="w-28 shrink-0 hidden sm:block text-[11px] truncate font-semibold tracking-wide"
                  style={{ color: isActive ? 'rgba(212,200,160,0.70)' : 'rgba(100,130,50,0.45)' }}>
                  {(track.artist || '---').toUpperCase()}
                </span>

                {/* Duration */}
                <span className="w-12 shrink-0 text-right text-[11px] tabular-nums font-bold"
                  style={{ color: isActive ? 'rgba(139,32,32,0.80)' : 'rgba(100,130,50,0.30)' }}>
                  {track.duration > 0 ? formatDuration(track.duration) : '--:--'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Anime theme: song list

function SakuraSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 p-3 pb-8">
        {tracks.slice(0, 400).map((track, i) => {
          const isActive = playerTrack?.path === track.path
          return (
            <button
              key={track.path}
              onClick={() => onPlay(track, tracks)}
              className="flex items-center gap-2.5 p-2.5 text-left cursor-pointer transition-all duration-200 group"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: isActive
                  ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))',
                border: `1px solid ${isActive ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)' : 'var(--color-border)'}`,
                boxShadow: isActive ? 'var(--shadow-glow)' : undefined,
              }}
            >
              {/* Pill number */}
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: isActive ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                  color: isActive ? '#fff' : 'var(--color-accent)',
                }}
              >
                {isActive && isPlaying ? '♪' : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {track.title || track.path.split('/').pop()}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {track.artist || 'Unknown'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Vaporwave theme: song list

const CASSETTE_SIDES = ['A', 'B', 'C', 'D', 'E', 'F']
function getCasseteLabel(i: number) {
  return `${CASSETTE_SIDES[Math.floor(i / 9) % CASSETTE_SIDES.length]}${(i % 9) + 1}`
}

function VaporwaveSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      {/* Retro header */}
      <div
        className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-b sticky top-0 z-10"
        style={{
          background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 22%, var(--color-bg)), var(--color-bg))',
          borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
          color: 'var(--color-accent)',
          fontFamily: 'monospace',
        }}
      >
        <span className="w-10 shrink-0">TAPE</span>
        <span className="flex-1">TITLE</span>
        <span className="w-28 shrink-0 hidden sm:block">ARTIST</span>
        <span className="w-12 shrink-0 text-right">TIME</span>
      </div>

      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          return (
            <div
              key={track.path}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                height: item.size, transform: `translateY(${item.start}px)`,
              }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-4 px-4 h-full cursor-pointer group"
                style={{
                  background: isActive
                    ? 'linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent)'
                    : undefined,
                  borderLeft: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                  fontFamily: 'monospace',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <span className="w-10 shrink-0 text-xs font-bold"
                  style={{ color: isActive ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 50%, transparent)' }}>
                  {isActive ? (isPlaying ? '▶' : '‖') : getCasseteLabel(item.index)}
                </span>
                <span className="flex-1 text-xs truncate font-medium" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {track.title || track.path.split('/').pop()}
                </span>
                <span className="w-28 shrink-0 hidden sm:block text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                  {track.artist || '---'}
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted)' }}>
                  {track.duration > 0 ? formatDuration(track.duration) : '--:--'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Cyberpunk theme: song list

function TerminalSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto font-mono">
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-b sticky top-0 z-10"
        style={{ color: 'var(--color-accent)', borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)', background: 'var(--color-bg)' }}>
        <span className="w-8 shrink-0">#</span>
        <span className="flex-1">TITLE</span>
        <span className="w-28 shrink-0 hidden sm:block">ARTIST</span>
        <span className="w-12 shrink-0 text-right">TIME</span>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          return (
            <div
              key={track.path}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                height: item.size, transform: `translateY(${item.start}px)`,
              }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-4 px-4 h-full cursor-pointer group transition-all duration-100"
                style={{
                  borderLeft: isActive
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  background: isActive
                    ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                    : undefined,
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 4%, transparent)'
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                <span className="w-8 shrink-0 text-xs tabular-nums"
                  style={{ color: isActive ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 40%, transparent)' }}>
                  {isActive
                    ? (isPlaying ? '▶' : '‖')
                    : String(item.index + 1).padStart(2, '0')}
                </span>
                <span className={`flex-1 text-xs truncate font-semibold ${isActive ? '' : 'text-zinc-200'}`}
                  style={isActive ? { color: 'var(--color-accent)' } : {}}>
                  {track.title || track.path.split('/').pop()}
                </span>
                <span className="w-28 shrink-0 hidden sm:block text-xs truncate text-zinc-500">
                  {track.artist || '---'}
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-600">
                  {track.duration > 0 ? formatDuration(track.duration) : '--:--'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Minimal theme: song list

function MinimalSongList({ tracks, playerTrack, isPlaying, onPlay }: {
  tracks: Track[]
  playerTrack: Track | null
  isPlaying: boolean
  onPlay: (track: Track, queue: Track[]) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const track = tracks[item.index]
          const isActive = playerTrack?.path === track.path
          return (
            <div
              key={track.path}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                height: item.size, transform: `translateY(${item.start}px)`,
              }}
            >
              <div
                onClick={() => onPlay(track, tracks)}
                className="flex items-center gap-4 px-5 h-full cursor-pointer group border-b border-white/[0.04] transition-opacity duration-150"
                style={{ opacity: isActive ? 1 : 0.55 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = '0.55' }}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? '' : 'text-zinc-100'}`}
                    style={isActive ? { color: 'var(--color-accent)' } : {}}>
                    {track.title || track.path.split('/').pop()}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {track.artist || 'Unknown'}
                    {track.album ? <span className="text-zinc-700"> — {track.album}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--color-accent)' }}>
                      {isPlaying ? 'playing' : 'paused'}
                    </span>
                  )}
                  {track.duration > 0 && (
                    <span className="text-xs text-zinc-600 tabular-nums">{formatDuration(track.duration)}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Main page component

export default function PlayerPage({ defaultTab = 'songs', standalone = false }: { defaultTab?: Tab; standalone?: boolean }) {
  const {
    musicFolders, tracks, isScanning, setTracks, setScanning,
    playerTrack, isPlaying, playTrack, setIsPlaying,
    shuffleOn, toggleShuffle,
  } = useLibraryStore()
  const { trackLayout } = useTheme()
  const L = useThemeLabels()

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [drillAlbum, setDrillAlbum] = useState<string | null>(null)
  const [drillArtist, setDrillArtist] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // ── Scan ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (musicFolders.length > 0 && tracks.length === 0) scanAllFolders(musicFolders)
  }, [])

  async function scanAllFolders(folders: string[]) {
    setScanning(true)
    try {
      const results = await Promise.all(
        folders.map(path => invoke<RawTrack[]>('scan_folder', { path, skipCover: true }))
      )
      setTracks(results.flat().map(rawToTrack))
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

  // ── Sorting ───────────────────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title')    cmp = (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'artist')   cmp = (a.artist || '').localeCompare(b.artist || '')
      if (sortBy === 'album')    cmp = (a.album || '').localeCompare(b.album || '')
      if (sortBy === 'duration') cmp = a.duration - b.duration
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortBy, sortDir])

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

  if (musicFolders.length === 0) {
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
            {standalone ? (defaultTab === 'albums' ? L.navAlbums : defaultTab === 'artists' ? L.navArtists : L.navSongs) : L.navSongs}
          </h1>
          <button
            onClick={() => musicFolders.length > 0 && scanAllFolders(musicFolders)}
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
                {t === 'songs' ? L.navSongs : t === 'albums' ? L.navAlbums : L.navArtists}
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

            {/* Sort controls (only for songs) */}
            {tab === 'songs' && !inDrill && (
              <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
                {(['title', 'artist', 'album', 'duration'] as SortKey[]).map(key => {
                  const active = sortBy === key
                  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ArrowUpDown
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                        active ? 'bg-white/15 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {key === 'duration' ? <Icon className="w-3 h-3" /> : <>{key.charAt(0).toUpperCase() + key.slice(1)} <Icon className="w-3 h-3" /></>}
                    </button>
                  )
                })}
              </div>
            )}

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
      <div className={`flex-1 min-h-0 ${!inDrill && tab === 'songs' ? 'overflow-hidden' : 'overflow-y-auto px-3 pb-4'}`}>

        {/* Drill-down: Album detail */}
        {drillAlbum && (() => {
          const album = albums.find(a => a.name === drillAlbum)
          if (!album) return null
          return (
            <div className="flex flex-col h-full -mx-3 -mt-4">
              <AlbumHeader
                album={album}
                onBack={closeDrill}
                onPlay={() => drillTracks.length > 0 && playTrack(drillTracks[0], drillTracks)}
                onShuffle={() => {
                  if (drillTracks.length === 0) return
                  const s = [...drillTracks].sort(() => Math.random() - 0.5)
                  playTrack(s[0], s)
                }}
              />
              <div className="px-3 pb-4">
                {drillTracks.length === 0
                  ? <Empty message={L.noSongsFound} />
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
            </div>
          )
        })()}

        {/* Drill-down: Artist detail */}
        {drillArtist && (() => {
          const artist = artists.find(a => a.name === drillArtist)
          if (!artist) return null
          return (
            <div className="flex flex-col h-full -mx-3 -mt-4">
              <ArtistHeader
                artist={artist}
                onBack={closeDrill}
                onPlay={() => drillTracks.length > 0 && playTrack(drillTracks[0], drillTracks)}
                onShuffle={() => {
                  if (drillTracks.length === 0) return
                  const s = [...drillTracks].sort(() => Math.random() - 0.5)
                  playTrack(s[0], s)
                }}
              />
              <div className="px-3 pb-4">
                {drillTracks.length === 0
                  ? <Empty message={L.noSongsFound} />
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
            </div>
          )
        })()}

        {/* Songs tab */}
        {!inDrill && tab === 'songs' && (
          sorted.length === 0
            ? <Empty message={isScanning ? L.scanning : L.noSongsFound} />
            : trackLayout === 'grimoire'
              ? <GrimoireSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
            : trackLayout === 'tactical'
              ? <TacticalSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
            : trackLayout === 'blame'
              ? <BlameNetscanner tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
              : trackLayout === 'sakura'
              ? <SakuraSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
              : trackLayout === 'vaporwave'
              ? <VaporwaveSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
              : trackLayout === 'terminal'
              ? <TerminalSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
              : trackLayout === 'minimal'
              ? <MinimalSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
              : <VirtualSongList tracks={sorted} playerTrack={playerTrack} isPlaying={isPlaying} onPlay={handlePlayTrack} />
        )}

        {/* Albums tab */}
        {!inDrill && tab === 'albums' && (
          albums.length === 0
            ? <Empty message={isScanning ? L.scanning : L.noSongsFound} />
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
                        <LazyCover path={album.firstTrackPath} className="absolute inset-0 w-full h-full object-cover" />
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
            ? <Empty message={isScanning ? L.scanning : L.noSongsFound} />
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
