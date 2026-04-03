import { useMemo } from 'react'
import { Heart, ListPlus, Check, Play, Shuffle, Pause } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'
import { useThemeLabels } from '../hooks/useTheme'
import { formatDuration } from '../utils'
import LazyCover from '../components/LazyCover'

function LikedRow({ track, onPlay, onUnlike }: { track: Track; onPlay: () => void; onUnlike: () => void }) {
  const addToQueue = useLibraryStore(s => s.addToQueue)
  const inQueue = useLibraryStore(s => s.playerQueue.some(t => t.path === track.path))
  const playerTrack = useLibraryStore(s => s.playerTrack)
  const isPlaying = useLibraryStore(s => s.isPlaying)
  const isActive = playerTrack?.path === track.path

  return (
    <div
      onClick={onPlay}
      className={`flex items-center gap-3 px-3 py-2.5 group cursor-pointer song-row transition-colors ${
        isActive ? 'bg-accent/10' : ''
      }`}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      {/* Cover with play overlay */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
        <LazyCover path={track.path} coverArt={track.coverArt} className="absolute inset-0 w-full h-full" iconSize={16} />
        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity rounded-lg ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isActive && isPlaying
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-zinc-200'}`}>
          {track.title || track.path.split('/').pop()}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
          {track.artist || 'Unknown Artist'}
          {track.album ? <span style={{ opacity: 0.7 }}> · {track.album}</span> : null}
        </p>
      </div>

      {track.duration > 0 && (
        <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--color-muted)' }}>
          {formatDuration(track.duration)}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); addToQueue(track) }}
        disabled={inQueue}
        title={inQueue ? 'Already in queue' : 'Add to queue'}
        className={`shrink-0 p-1.5 opacity-0 group-hover:opacity-100 transition-all ${
          inQueue ? 'text-accent cursor-default' : 'text-zinc-600 hover:text-zinc-300'
        }`}
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        {inQueue ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onUnlike() }}
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
  const { tracks, likedPaths, toggleLike, playTrack, shuffleOn, toggleShuffle } = useLibraryStore()
  const L = useThemeLabels()
  const liked = useMemo(() => tracks.filter((t) => likedPaths.includes(t.path)), [tracks, likedPaths])

  const totalSecs = useMemo(() => liked.reduce((s, t) => s + t.duration, 0), [liked])
  const totalMin = Math.round(totalSecs / 60)

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
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>{L.likesTitle}</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          {L.songCount(liked.length)}{totalMin > 0 ? ` · ${totalMin} min` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => playTrack(liked[0], liked)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-all shadow-lg shadow-accent/20"
          >
            <Play className="w-4 h-4" />
            Play
          </button>
          <button
            onClick={() => {
              if (!shuffleOn) toggleShuffle()
              const idx = Math.floor(Math.random() * liked.length)
              playTrack(liked[idx], liked)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 text-zinc-300 text-sm font-semibold transition-all"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
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
