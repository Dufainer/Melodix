import { Heart, ListPlus, Check } from 'lucide-react'
import { useLibraryStore } from '../store'
import CoverArt from '../components/CoverArt'
import { Track } from '../types'
import { useThemeLabels } from '../hooks/useThemeLabels'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function LikedRow({ track, onPlay, onUnlike }: { track: Track; onPlay: () => void; onUnlike: () => void }) {
  const addToQueue = useLibraryStore(s => s.addToQueue)
  const inQueue = useLibraryStore(s => s.playerQueue.some(t => t.path === track.path))
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 group transition-colors cursor-pointer song-row"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0" onClick={onPlay}>
        <CoverArt src={track.coverArt} path={track.path} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-white transition-colors" style={{ color: 'var(--color-text)' }}>
            {track.title || track.path.split('/').pop()}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
            {track.artist || 'Unknown Artist'}
            {track.album ? <span style={{ opacity: 0.7 }}> · {track.album}</span> : null}
          </p>
        </div>
      </div>
      {track.duration > 0 && (
        <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--color-muted)' }}>{formatDuration(track.duration)}</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); addToQueue(track) }}
        disabled={inQueue}
        title={inQueue ? 'Already in queue' : 'Add to queue'}
        className={`shrink-0 p-1.5 opacity-0 group-hover:opacity-100 transition-all ${inQueue ? 'text-accent cursor-default' : 'text-zinc-600 hover:text-zinc-300'}`}
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        {inQueue ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
      </button>
      <button
        onClick={onUnlike}
        className="shrink-0 p-1.5 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
        style={{ borderRadius: 'var(--radius-sm)' }}
        title="Remove from Likes"
      >
        <Heart className="w-4 h-4 fill-current" />
      </button>
    </div>
  )
}

export default function LikesPage() {
  const { tracks, likedPaths, toggleLike, playTrack } = useLibraryStore()
  const L = useThemeLabels()
  const liked = tracks.filter((t) => likedPaths.includes(t.path))

  if (likedPaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--color-muted)' }}>
        <Heart className="w-16 h-16 opacity-30" />
        <div className="text-center">
          <p className="text-base font-medium">{L.likesEmpty}</p>
          <p className="text-sm mt-1 opacity-70">{L.likesEmptySub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Heart className="w-5 h-5 text-red-400 fill-current" />
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{L.likesTitle}</h1>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{L.songCount(liked.length)}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {liked.map((track) => (
          <LikedRow
            key={track.path}
            track={track}
            onPlay={() => playTrack(track, liked)}
            onUnlike={() => toggleLike(track.path)}
          />
        ))}
        {likedPaths.length > liked.length && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--color-muted)' }}>
            {likedPaths.length - liked.length} liked song{likedPaths.length - liked.length !== 1 ? 's' : ''} not in current library
          </p>
        )}
      </div>
    </div>
  )
}
