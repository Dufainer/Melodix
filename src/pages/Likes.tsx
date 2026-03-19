import { Heart } from 'lucide-react'
import { useLibraryStore } from '../store'
import CoverArt from '../components/CoverArt'
import { Track } from '../types'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function LikedRow({ track, onPlay, onUnlike }: { track: Track; onPlay: () => void; onUnlike: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 group transition-colors">
      <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0" onClick={onPlay}>
        <CoverArt src={track.coverArt} path={track.path} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
            {track.title || track.path.split('/').pop()}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {track.artist || 'Unknown Artist'}
            {track.album ? <span className="text-zinc-600"> · {track.album}</span> : null}
          </p>
        </div>
      </div>
      {track.duration > 0 && (
        <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatDuration(track.duration)}</span>
      )}
      <button
        onClick={onUnlike}
        className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove from Likes"
      >
        <Heart className="w-4 h-4 fill-current" />
      </button>
    </div>
  )
}

export default function LikesPage() {
  const { tracks, likedPaths, toggleLike, playTrack } = useLibraryStore()
  const liked = tracks.filter((t) => likedPaths.includes(t.path))

  if (likedPaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
        <Heart className="w-16 h-16 opacity-30" />
        <div className="text-center">
          <p className="text-base font-medium">No liked songs yet</p>
          <p className="text-sm mt-1">Tap the heart icon on any song to save it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/5 shrink-0 flex items-center gap-3">
        <Heart className="w-5 h-5 text-red-400 fill-current" />
        <h1 className="text-base font-semibold text-white">Liked Songs</h1>
        <span className="text-xs text-zinc-500">{liked.length} song{liked.length !== 1 ? 's' : ''}</span>
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
          <p className="text-xs text-zinc-600 px-4 py-2">
            {likedPaths.length - liked.length} liked song{likedPaths.length - liked.length !== 1 ? 's' : ''} not in current library
          </p>
        )}
      </div>
    </div>
  )
}
