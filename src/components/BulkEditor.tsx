import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  X, Sparkles, Save, CheckCircle, XCircle, Clock, Loader2, Minus, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track, FetchStep, FetchResult } from '../types'
import { autoFetchMetadata } from '../services/autoFetch'

type BulkField =
  | 'title' | 'artist' | 'album' | 'albumArtist'
  | 'genre' | 'year' | 'coverArt' | 'lyrics' | 'composer' | 'comment'

const FIELD_OPTIONS: Array<{ key: BulkField; label: string }> = [
  { key: 'title',       label: 'Title' },
  { key: 'artist',      label: 'Artist' },
  { key: 'album',       label: 'Album' },
  { key: 'albumArtist', label: 'Album Artist' },
  { key: 'genre',       label: 'Genre' },
  { key: 'year',        label: 'Year' },
  { key: 'coverArt',    label: 'Cover Art' },
  { key: 'lyrics',      label: 'Lyrics' },
  { key: 'composer',    label: 'Composer' },
  { key: 'comment',     label: 'Comment' },
]

const DEFAULT_FIELDS: Set<BulkField> = new Set([
  'title', 'artist', 'album', 'albumArtist', 'genre', 'year', 'coverArt', 'lyrics', 'composer',
])

interface TrackResult {
  track: Track
  status: 'pending' | 'running' | 'done' | 'error'
  steps: FetchStep[]
  updates: Partial<Track>
  error?: string
  saved?: boolean
  expanded?: boolean
}

function stepIcon(status: FetchStep['status']) {
  if (status === 'pending')  return <Clock      className="w-3 h-3 text-zinc-600 shrink-0" />
  if (status === 'running')  return <Loader2    className="w-3 h-3 text-accent animate-spin shrink-0" />
  if (status === 'success')  return <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
  if (status === 'error')    return <XCircle    className="w-3 h-3 text-red-500 shrink-0" />
  return                            <Minus      className="w-3 h-3 text-zinc-700 shrink-0" />
}

function applyFields(fetched: FetchResult, fields: Set<BulkField>): Partial<Track> {
  const u: Partial<Track> = {}
  if (fields.has('title')       && fetched.title)       u.title       = fetched.title
  if (fields.has('artist')      && fetched.artist)      u.artist      = fetched.artist
  if (fields.has('album')       && fetched.album)       u.album       = fetched.album
  if (fields.has('albumArtist') && fetched.albumArtist) u.albumArtist = fetched.albumArtist
  if (fields.has('genre')       && fetched.genre)       u.genre       = fetched.genre
  if (fields.has('year')        && fetched.year)        u.year        = fetched.year
  if (fields.has('coverArt')    && fetched.coverArt)    u.coverArt    = fetched.coverArt
  if (fields.has('lyrics')      && fetched.lyrics)      u.lyrics      = fetched.lyrics
  if (fields.has('composer')    && fetched.composer)    u.composer    = fetched.composer
  if (fields.has('comment')     && fetched.comment)     u.comment     = fetched.comment
  return u
}

export default function BulkEditor() {
  const { tracks, selectedPaths, clearSelection, updateTrack } = useLibraryStore()
  const selectedTracks = tracks.filter((t) => selectedPaths.includes(t.path))

  const [enabledFields, setEnabledFields] = useState<Set<BulkField>>(new Set(DEFAULT_FIELDS))
  const [results, setResults] = useState<TrackResult[]>([])
  const [phase, setPhase] = useState<'config' | 'fetching' | 'done'>('config')
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)

  function toggleField(field: BulkField) {
    setEnabledFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  function toggleExpanded(path: string) {
    setResults((prev) =>
      prev.map((r) => r.track.path === path ? { ...r, expanded: !r.expanded } : r)
    )
  }

  async function handleFetchAll() {
    const snapshot = [...selectedTracks]
    const initial: TrackResult[] = snapshot.map((t) => ({
      track: t, status: 'pending', steps: [], updates: {}, expanded: false,
    }))
    setResults(initial)
    setPhase('fetching')
    setIsFetching(true)
    setCurrentIdx(0)

    for (let i = 0; i < snapshot.length; i++) {
      const track = snapshot[i]
      setCurrentIdx(i)

      setResults((prev) =>
        prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r)
      )

      try {
        const fetched = await autoFetchMetadata(
          { title: track.title, artist: track.artist, album: track.album },
          (steps) => {
            setResults((prev) =>
              prev.map((r, idx) => idx === i ? { ...r, steps: [...steps] } : r)
            )
          }
        )
        const updates = applyFields(fetched, enabledFields)
        setResults((prev) =>
          prev.map((r, idx) => idx === i ? { ...r, status: 'done', updates } : r)
        )
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: String(err) } : r)
        )
      }
    }

    setIsFetching(false)
    setPhase('done')
  }

  async function handleSaveAll() {
    setIsSaving(true)
    for (const result of results) {
      if (result.status !== 'done') continue
      const { track, updates } = result
      if (Object.keys(updates).length === 0) continue
      try {
        const payload = {
          path: track.path,
          format: track.format,
          title:        updates.title        ?? track.title,
          artist:       updates.artist       ?? track.artist,
          album:        updates.album        ?? track.album,
          album_artist: updates.albumArtist  ?? track.albumArtist,
          genre:        updates.genre        ?? track.genre,
          year:         updates.year         ?? track.year,
          track_number: track.trackNumber,
          disc_number:  track.discNumber,
          duration:     track.duration,
          cover_art:    updates.coverArt     ?? track.coverArt    ?? null,
          bit_depth:    track.bitDepth       ?? null,
          sample_rate:  track.sampleRate,
          bitrate:      track.bitrate,
          file_size:    track.fileSize,
          lyrics:       updates.lyrics       ?? track.lyrics      ?? null,
          comment:      updates.comment      ?? track.comment     ?? null,
          composer:     updates.composer     ?? track.composer    ?? null,
        }
        await invoke('write_metadata', { path: track.path, metadata: payload })
        updateTrack(track.path, updates)
        setResults((prev) =>
          prev.map((r) => r.track.path === track.path ? { ...r, saved: true } : r)
        )
      } catch (err) {
        setResults((prev) =>
          prev.map((r) =>
            r.track.path === track.path ? { ...r, error: String(err) } : r
          )
        )
      }
    }
    setIsSaving(false)
  }

  function handleReset() {
    setResults([])
    setPhase('config')
    setCurrentIdx(0)
  }

  const doneCount  = results.filter((r) => r.status === 'done').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const savedCount = results.filter((r) => r.saved).length
  const hasUpdates = results.some((r) => r.status === 'done' && Object.keys(r.updates).length > 0)

  return (
    <aside className="editor-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Bulk Edit</h2>
          <p className="text-xs text-violet-400 mt-0.5">{selectedPaths.length} tracks selected</p>
        </div>
        <button
          onClick={clearSelection}
          className="text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Field selection */}
        {phase === 'config' && (
          <div className="glass-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400">Fields to update</p>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => setEnabledFields(new Set(FIELD_OPTIONS.map((f) => f.key)))}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >All</button>
                <button
                  onClick={() => setEnabledFields(new Set())}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={enabledFields.has(key)}
                    onChange={() => toggleField(key)}
                    className="w-3 h-3 rounded accent-violet-500 cursor-pointer"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Progress overview */}
        {phase !== 'config' && (
          <div className="glass-card space-y-2">
            {isFetching ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                    Processing…
                  </span>
                  <span className="text-zinc-500">
                    {Math.min(currentIdx + 1, selectedTracks.length)} / {selectedTracks.length}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div
                    className="bg-accent h-1 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / selectedTracks.length) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  {phase === 'done' ? 'Fetch complete' : ''}
                </span>
                <span className="flex gap-3">
                  <span className="text-green-400">{doneCount} done</span>
                  {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                  {savedCount > 0 && <span className="text-violet-400">{savedCount} saved</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Per-track results */}
        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((result) => {
              const name = result.track.title || result.track.path.split('/').pop() || result.track.path
              const updatedCount = Object.keys(result.updates).length
              return (
                <div key={result.track.path} className="glass-card !py-2 !px-3 space-y-1.5">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleExpanded(result.track.path)}
                  >
                    <span className="shrink-0">
                      {result.status === 'pending' && <Clock      className="w-3.5 h-3.5 text-zinc-600" />}
                      {result.status === 'running' && <Loader2    className="w-3.5 h-3.5 text-accent animate-spin" />}
                      {result.status === 'done'    && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                      {result.status === 'error'   && <XCircle    className="w-3.5 h-3.5 text-red-500" />}
                    </span>
                    <span className="text-xs text-zinc-300 truncate flex-1">{name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {result.saved && <span className="text-xs text-violet-400">saved</span>}
                      {result.status === 'done' && updatedCount > 0 && !result.saved && (
                        <span className="text-xs text-zinc-500">{updatedCount} fields</span>
                      )}
                      {result.steps.length > 0 && (
                        result.expanded
                          ? <ChevronUp   className="w-3 h-3 text-zinc-600" />
                          : <ChevronDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </span>
                  </div>

                  {result.error && !result.expanded && (
                    <p className="text-xs text-red-400 truncate pl-5">{result.error}</p>
                  )}

                  {result.expanded && result.steps.length > 0 && (
                    <div className="pl-5 space-y-1 border-t border-white/5 pt-1.5">
                      {result.steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-1.5 text-xs">
                          <span className="mt-0.5">{stepIcon(step.status)}</span>
                          <div className="min-w-0">
                            <p className={
                              step.status === 'running' ? 'text-zinc-300' :
                              step.status === 'success' ? 'text-zinc-400' :
                              step.status === 'error'   ? 'text-red-400'  :
                              'text-zinc-600'
                            }>
                              {step.label}
                            </p>
                            {step.detail && (
                              <p className={`truncate ${step.status === 'error' ? 'text-red-500' : 'text-zinc-600'}`}>
                                {step.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0 space-y-2">
        {phase === 'config' && (
          <button
            onClick={handleFetchAll}
            disabled={enabledFields.size === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            Auto-fetch All ({selectedTracks.length} tracks)
          </button>
        )}

        {phase === 'fetching' && (
          <button disabled className="btn-primary w-full flex items-center justify-center gap-2 text-sm opacity-50">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching… {Math.min(currentIdx + 1, selectedTracks.length)}/{selectedTracks.length}
          </button>
        )}

        {phase === 'done' && (
          <>
            {hasUpdates && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving…' : `Save All (${doneCount - savedCount} pending)`}
              </button>
            )}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg
                         text-zinc-500 hover:text-zinc-300 border border-white/10 hover:border-white/20
                         transition-all duration-200"
            >
              Fetch Again
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
