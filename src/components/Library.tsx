import { useLibraryStore } from '../store'
import { Track } from '../types'
import CoverArt from './CoverArt'
import { formatDuration } from '../utils'
import { Clock, Music } from 'lucide-react'

const FORMAT_COLORS: Record<string, string> = {
  flac: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  mp3:  'bg-green-500/20 text-green-300 border-green-500/30',
  aac:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ogg:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  opus: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  wav:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  aiff: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
}


function FormatBadge({ format }: { format: string }) {
  const cls = FORMAT_COLORS[format.toLowerCase()] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
  return (
    <span className={`format-badge ${cls}`}>
      {format.toUpperCase()}
    </span>
  )
}

interface TrackCardProps {
  track: Track
  isSelected: boolean
  isChecked: boolean
  onSelect: (track: Track) => void
  onCheck: (path: string) => void
}

function TrackCard({ track, isSelected, isChecked, onSelect, onCheck }: TrackCardProps) {
  return (
    <div
      className={`track-card group flex items-start gap-2
        ${isSelected ? 'ring-1 ring-accent/60 bg-accent/10' : ''}
        ${isChecked ? 'ring-1 ring-violet-500/60 bg-violet-500/10' : ''}`}
    >
      {/* Checkbox */}
      <div
        className="shrink-0 flex items-center justify-center w-5 h-5 mt-0.5 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onCheck(track.path) }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onCheck(track.path)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
        />
      </div>

      {/* Main clickable area */}
      <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(track)}>
        <CoverArt src={track.coverArt} path={track.path} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
              {track.title || track.path.split('/').pop()}
            </p>
            <FormatBadge format={track.format} />
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{track.artist}</p>
          <p className="text-xs text-zinc-600 truncate">{track.album}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-600">
            {track.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(track.duration)}
              </span>
            )}
            {track.sampleRate > 0 && (
              <span>{(track.sampleRate / 1000).toFixed(1)} kHz</span>
            )}
            {track.bitDepth && (
              <span>{track.bitDepth}-bit</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Library() {
  const { editorTracks, selectedTrack, selectedPaths, searchQuery, selectTrack, toggleSelection, selectAllFiltered, clearSelection } = useLibraryStore()

  const filtered = editorTracks.filter((t) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    )
  })

  const filteredPaths = filtered.map((t) => t.path)
  const allChecked = filteredPaths.length > 0 && filteredPaths.every((p) => selectedPaths.includes(p))

  if (editorTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
        <Music className="w-16 h-16 opacity-30" />
        <div className="text-center">
          <p className="text-base font-medium">No tracks loaded</p>
          <p className="text-sm mt-1">Click &ldquo;Open Folder&rdquo; to scan a music directory</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 text-xs text-zinc-500 border-b border-white/5 shrink-0 flex items-center justify-between gap-3">
        <span>
          {filtered.length} track{filtered.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        <div className="flex items-center gap-3">
          {selectedPaths.length > 0 && (
            <span className="text-violet-400 font-medium">
              {selectedPaths.length} selected
            </span>
          )}
          <button
            onClick={() => allChecked ? clearSelection() : selectAllFiltered(filteredPaths)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
          {selectedPaths.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.map((track) => (
          <TrackCard
            key={track.path}
            track={track}
            isSelected={selectedTrack?.path === track.path}
            isChecked={selectedPaths.includes(track.path)}
            onSelect={selectTrack}
            onCheck={toggleSelection}
          />
        ))}
      </div>
    </div>
  )
}
