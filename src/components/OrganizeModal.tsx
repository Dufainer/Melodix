import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, X, CheckCircle, XCircle, Loader2, FolderSymlink } from 'lucide-react'
import { useLibraryStore } from '../store'
import { OrganizeResult } from '../types'
import { buildPreviewPath } from '../services/fileOps'

interface Props {
  onClose: () => void
}

export default function OrganizeModal({ onClose }: Props) {
  const { tracks, selectedPaths, filePattern, folderPattern, renameTrackPath } = useLibraryStore()

  const targets = selectedPaths.length > 0
    ? tracks.filter((t) => selectedPaths.includes(t.path))
    : tracks

  const defaultBase = targets[0]
    ? targets[0].path.substring(0, targets[0].path.lastIndexOf('/'))
    : ''

  const [baseDir, setBaseDir]     = useState(defaultBase)
  const [phase, setPhase]         = useState<'preview' | 'organizing' | 'done'>('preview')
  const [results, setResults]     = useState<OrganizeResult[]>([])

  useEffect(() => {
    setBaseDir(defaultBase)
  }, [defaultBase])

  async function handlePickFolder() {
    const dir = await open({ directory: true, multiple: false, title: 'Choose destination folder' })
    if (dir && typeof dir === 'string') setBaseDir(dir)
  }

  async function handleOrganize() {
    setPhase('organizing')
    try {
      const trackInfos = targets.map((t) => ({
        path:         t.path,
        title:        t.title,
        artist:       t.artist,
        album:        t.album,
        track_number: t.trackNumber,
        disc_number:  t.discNumber,
        year:         t.year,
        genre:        t.genre,
      }))
      const res = await invoke<OrganizeResult[]>('organize_tracks', {
        tracks:        trackInfos,
        baseDir:       baseDir,
        folderPattern: folderPattern,
        filePattern:   filePattern,
      })
      setResults(res)
      // Update store paths
      for (const r of res) {
        if (r.new_path && r.new_path !== r.original_path) {
          renameTrackPath(r.original_path, r.new_path)
        }
      }
    } catch (err) {
      setResults([{ original_path: 'global', new_path: null, error: String(err) }])
    }
    setPhase('done')
  }

  const moved   = results.filter((r) => r.new_path && r.new_path !== r.original_path).length
  const skipped = results.filter((r) => r.new_path && r.new_path === r.original_path).length
  const failed  = results.filter((r) => r.error).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-[580px] max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <FolderSymlink className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-zinc-200">Organize Library</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Scope */}
          <p className="text-xs text-zinc-500">
            {selectedPaths.length > 0
              ? `Organizing ${targets.length} selected track${targets.length !== 1 ? 's' : ''}`
              : `Organizing all ${targets.length} tracks in library`
            }
          </p>

          {/* Patterns (read-only, edit in Settings) */}
          <div className="glass-card space-y-2 text-xs">
            <p className="text-zinc-400 font-medium">Patterns <span className="text-zinc-600 font-normal">(edit in Settings)</span></p>
            <div className="flex gap-4">
              <div>
                <span className="text-zinc-600">Folder: </span>
                <span className="text-zinc-300 font-mono">{folderPattern}</span>
              </div>
              <div>
                <span className="text-zinc-600">File: </span>
                <span className="text-zinc-300 font-mono">{filePattern}</span>
              </div>
            </div>
          </div>

          {/* Destination folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Destination folder</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 truncate font-mono">
                {baseDir || 'No folder selected'}
              </div>
              <button
                onClick={handlePickFolder}
                disabled={phase !== 'preview'}
                className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse
              </button>
            </div>
          </div>

          {/* Preview */}
          {phase === 'preview' && targets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-500">
                Preview <span className="text-zinc-700">(first {Math.min(8, targets.length)})</span>
              </p>
              <div className="glass-card !p-0 overflow-hidden">
                {targets.slice(0, 8).map((t) => {
                  const preview = buildPreviewPath(folderPattern, filePattern, t, t.format)
                  return (
                    <div key={t.path} className="px-3 py-2 border-b border-white/5 last:border-0">
                      <p className="text-xs text-zinc-600 truncate font-mono">
                        {t.path.split('/').pop()}
                      </p>
                      <p className="text-xs text-zinc-300 truncate font-mono mt-0.5">
                        → {baseDir}/{preview}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Organizing spinner */}
          {phase === 'organizing' && (
            <div className="flex items-center justify-center gap-2 py-8 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Moving files…
            </div>
          )}

          {/* Results */}
          {phase === 'done' && (
            <div className="space-y-2">
              <div className="glass-card text-xs flex gap-4">
                <span className="text-green-400">{moved} moved</span>
                {skipped > 0 && <span className="text-zinc-500">{skipped} already in place</span>}
                {failed  > 0 && <span className="text-red-400">{failed} failed</span>}
              </div>
              {failed > 0 && (
                <div className="space-y-1">
                  {results.filter((r) => r.error).map((r) => (
                    <div key={r.original_path} className="glass-card !py-2 flex items-start gap-2 text-xs">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-zinc-400 truncate font-mono">{r.original_path.split('/').pop()}</p>
                        <p className="text-red-400 truncate">{r.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {failed === 0 && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  All done!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0 flex gap-2 justify-end">
          {phase !== 'done' ? (
            <>
              <button
                onClick={onClose}
                disabled={phase === 'organizing'}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-white/10
                           hover:border-white/20 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOrganize}
                disabled={!baseDir || phase === 'organizing'}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
              >
                {phase === 'organizing'
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Moving…</>
                  : <><FolderSymlink className="w-4 h-4" />Organize {targets.length} tracks</>
                }
              </button>
            </>
          ) : (
            <button onClick={onClose} className="btn-primary text-sm px-6">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
