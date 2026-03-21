import { useRef, useState } from 'react'
import { X, GripVertical, ListMusic, Music2 } from 'lucide-react'
import { useLibraryStore } from '../store'
import CoverArt from './CoverArt'

export default function QueuePanel() {
  const {
    queueOpen, setQueueOpen,
    playerTrack, playerQueue,
    removeFromQueue, reorderQueue,
    playTrack,
  } = useLibraryStore()

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragFromIdx = useRef<number | null>(null)

  const currentIdx = playerQueue.findIndex(t => t.path === playerTrack?.path)
  const upNext = playerQueue.slice(currentIdx + 1)

  // Map local "upNext" index to full queue index
  const toQueueIdx = (localIdx: number) => currentIdx + 1 + localIdx

  function handleDragStart(localIdx: number) {
    dragFromIdx.current = localIdx
  }

  function handleDragOver(e: React.DragEvent, localIdx: number) {
    e.preventDefault()
    setDragOverIdx(localIdx)
  }

  function handleDrop(localIdx: number) {
    const from = dragFromIdx.current
    if (from === null || from === localIdx) { setDragOverIdx(null); return }
    reorderQueue(toQueueIdx(from), toQueueIdx(localIdx))
    dragFromIdx.current = null
    setDragOverIdx(null)
  }

  if (!playerTrack) return null

  return (
    <>
      {/* Backdrop */}
      {queueOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setQueueOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-[72px] w-76 z-50 flex flex-col
                    bg-zinc-950 border-l border-white/8
                    transition-transform duration-300 ease-out
                    ${queueOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-zinc-100">Cola</span>
          </div>
          <button
            onClick={() => setQueueOpen(false)}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {/* Now Playing */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2">
              Reproduciendo ahora
            </p>
            <div className="flex items-center gap-3 p-2 rounded-xl bg-accent/10 border border-accent/20">
              <CoverArt src={playerTrack.coverArt} size="sm" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-100 truncate">
                  {playerTrack.title || playerTrack.path.split('/').pop()}
                </p>
                <p className="text-xs text-zinc-500 truncate">{playerTrack.artist}</p>
              </div>
            </div>
          </div>

          {/* Up Next */}
          <div className="px-3 pb-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                A continuación
              </p>
              {upNext.length > 0 && (
                <span className="text-[10px] text-zinc-600">{upNext.length}</span>
              )}
            </div>

            {upNext.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Music2 className="w-8 h-8 text-zinc-800" />
                <p className="text-xs text-zinc-600">No hay más canciones</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {upNext.map((track, localIdx) => (
                  <div
                    key={`${track.path}-${localIdx}`}
                    draggable
                    onDragStart={() => handleDragStart(localIdx)}
                    onDragOver={(e) => handleDragOver(e, localIdx)}
                    onDrop={() => handleDrop(localIdx)}
                    onDragEnd={() => setDragOverIdx(null)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg group
                                transition-colors cursor-grab active:cursor-grabbing select-none
                                ${dragOverIdx === localIdx
                                  ? 'bg-accent/15 border border-accent/30'
                                  : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <GripVertical className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 shrink-0" />
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => playTrack(track, playerQueue)}
                    >
                      <CoverArt src={track.coverArt} path={track.path} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-300 truncate">
                          {track.title || track.path.split('/').pop()}
                        </p>
                        <p className="text-xs text-zinc-600 truncate">{track.artist}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => removeFromQueue(toQueueIdx(localIdx))}
                      className="shrink-0 text-zinc-700 hover:text-red-400 transition-colors
                                 opacity-0 group-hover:opacity-100 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
