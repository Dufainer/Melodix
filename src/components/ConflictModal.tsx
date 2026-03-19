import { useState } from 'react'
import { AlertTriangle, CheckCircle, SkipForward, RefreshCw } from 'lucide-react'

export interface RenameConflict {
  originalPath: string
  newPath: string
  originalName: string    // basename of original
  targetName: string      // basename of target
  originalSize: number
  existingSize: number
}

type ConflictAction = 'overwrite' | 'skip'

interface Props {
  conflicts: RenameConflict[]
  onResolve: (decisions: Map<string, ConflictAction>) => void
  onCancel: () => void
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ConflictModal({ conflicts, onResolve, onCancel }: Props) {
  const [decisions, setDecisions] = useState<Map<string, ConflictAction>>(
    () => new Map(conflicts.map((c) => [c.originalPath, 'skip']))
  )

  function setAll(action: ConflictAction) {
    setDecisions(new Map(conflicts.map((c) => [c.originalPath, action])))
  }

  function toggle(path: string) {
    setDecisions((prev) => {
      const next = new Map(prev)
      next.set(path, prev.get(path) === 'overwrite' ? 'skip' : 'overwrite')
      return next
    })
  }

  const overwriteCount = [...decisions.values()].filter((a) => a === 'overwrite').length
  const skipCount      = [...decisions.values()].filter((a) => a === 'skip').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 glass-card flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Duplicate Files Found</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {conflicts.length} file{conflicts.length !== 1 ? 's' : ''} already exist with the new name
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 shrink-0">
          <span className="text-xs text-zinc-500 mr-1">Apply to all:</span>
          <button
            onClick={() => setAll('overwrite')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border border-white/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-all duration-200"
          >
            <RefreshCw className="w-3 h-3" />Replace all
          </button>
          <button
            onClick={() => setAll('skip')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-all duration-200"
          >
            <SkipForward className="w-3 h-3" />Skip all
          </button>
        </div>

        {/* Conflict list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {conflicts.map((c) => {
            const action = decisions.get(c.originalPath) ?? 'skip'
            const isOverwrite = action === 'overwrite'
            return (
              <div
                key={c.originalPath}
                className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 space-y-2
                  ${isOverwrite ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/3'}`}
                onClick={() => toggle(c.originalPath)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOverwrite
                      ? <RefreshCw  className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      : <SkipForward className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                    <span className="text-xs font-mono text-zinc-300 truncate">{c.targetName}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full
                    ${isOverwrite ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-500'}`}>
                    {isOverwrite ? 'Replace' : 'Skip'}
                  </span>
                </div>

                {/* Size comparison */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-zinc-600">Current file (to rename)</p>
                    <p className="font-mono text-zinc-400 truncate">{c.originalName}</p>
                    <p className="text-zinc-600">{formatSize(c.originalSize)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-zinc-600">Existing file</p>
                    <p className="font-mono text-zinc-400 truncate">{c.targetName}</p>
                    <p className="text-zinc-600">{formatSize(c.existingSize)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 shrink-0 space-y-3">
          <div className="flex gap-3 text-xs text-zinc-500">
            {overwriteCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <RefreshCw className="w-3 h-3" />{overwriteCount} will be replaced
              </span>
            )}
            {skipCount > 0 && (
              <span className="flex items-center gap-1">
                <SkipForward className="w-3 h-3" />{skipCount} will be skipped
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2 text-sm rounded-lg border border-white/10 hover:border-white/20 text-zinc-500 hover:text-zinc-300 transition-all duration-200">
              Cancel
            </button>
            <button
              onClick={() => onResolve(decisions)}
              className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />Confirm ({overwriteCount + skipCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
