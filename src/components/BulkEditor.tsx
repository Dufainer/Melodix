import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import {
  X, Sparkles, Save, CheckCircle, XCircle, Clock, Loader2, Minus,
  ChevronDown, ChevronUp, FileText, FolderSymlink, FolderOpen, FileEdit, Trash2,
} from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track, FetchStep, FetchResult, OrganizeResult, RenameResult } from '../types'
import { autoFetchMetadata } from '../services/autoFetch'
import { applyPattern, applyFolderPattern } from '../services/fileOps'
import ConflictModal, { RenameConflict } from './ConflictModal'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'metadata' | 'files'

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

interface FileOpResult {
  filename: string
  newName: string | null
  error: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function stepIcon(status: FetchStep['status']) {
  if (status === 'pending')  return <Clock       className="w-3 h-3 text-zinc-600 shrink-0" />
  if (status === 'running')  return <Loader2     className="w-3 h-3 text-accent animate-spin shrink-0" />
  if (status === 'success')  return <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
  if (status === 'error')    return <XCircle     className="w-3 h-3 text-red-500 shrink-0" />
  return                            <Minus       className="w-3 h-3 text-zinc-700 shrink-0" />
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

type OpPhase = 'idle' | 'running' | 'done'

// ── Shared sub-component ───────────────────────────────────────────────────────

function ResultList({ results }: { results: FileOpResult[] }) {
  const ok   = results.filter((r) => !r.error).length
  const fail = results.filter((r) =>  r.error).length
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-xs">
        {ok   > 0 && <span className="text-green-400">{ok} succeeded</span>}
        {fail > 0 && <span className="text-red-400">{fail} failed</span>}
      </div>
      <div className="glass-card !p-0 overflow-hidden max-h-40 overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className="px-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
            <div className="flex items-center gap-1.5">
              {r.error ? <XCircle className="w-3 h-3 text-red-500 shrink-0" /> : <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
              <span className="text-zinc-400 truncate font-mono">{r.filename}</span>
            </div>
            {r.newName && !r.error && <p className="text-zinc-600 truncate font-mono pl-4 mt-0.5">→ {r.newName}</p>}
            {r.error   && <p className="text-red-400 truncate pl-4 mt-0.5">{r.error}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BulkEditor() {
  const {
    tracks, selectedPaths, clearSelection, updateTrack, renameTrackPath,
    filePattern, folderPattern,
  } = useLibraryStore()
  const selectedTracks = tracks.filter((t) => selectedPaths.includes(t.path))

  const [tab, setTab] = useState<Tab>('metadata')

  // — Metadata state
  const [enabledFields, setEnabledFields] = useState<Set<BulkField>>(new Set(DEFAULT_FIELDS))
  const [metaResults, setMetaResults]     = useState<TrackResult[]>([])
  const [metaPhase, setMetaPhase]         = useState<'config' | 'fetching' | 'done'>('config')
  const [isFetching, setIsFetching]       = useState(false)
  const [isSaving, setIsSaving]           = useState(false)
  const [currentIdx, setCurrentIdx]       = useState(0)

  // — Rename state (in-place)
  const [renamePhase, setRenamePhase]         = useState<OpPhase>('idle')
  const [renameResults, setRenameResults]     = useState<FileOpResult[]>([])
  const [conflicts, setConflicts]             = useState<RenameConflict[]>([])
  const [pendingRenames, setPendingRenames]   = useState<Map<string, RenameResult>>(new Map())

  // — Organize state (move to folders)
  const [organizePhase, setOrganizePhase]     = useState<OpPhase>('idle')
  const [organizeResults, setOrganizeResults] = useState<FileOpResult[]>([])
  const [baseDir, setBaseDir]                 = useState(
    () => selectedTracks[0]?.path.substring(0, selectedTracks[0].path.lastIndexOf('/')) ?? ''
  )
  const [baseDirError, setBaseDirError]       = useState('')
  const [cleanedDirs, setCleanedDirs]         = useState<number | null>(null)

  // ── Metadata handlers ────────────────────────────────────────────────────────

  function toggleField(field: BulkField) {
    setEnabledFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field); else next.add(field)
      return next
    })
  }

  async function handleFetchAll() {
    const snapshot = [...selectedTracks]
    const initial: TrackResult[] = snapshot.map((t) => ({
      track: t, status: 'pending', steps: [], updates: {}, expanded: false,
    }))
    setMetaResults(initial)
    setMetaPhase('fetching')
    setIsFetching(true)
    setCurrentIdx(0)

    for (let i = 0; i < snapshot.length; i++) {
      const track = snapshot[i]
      setCurrentIdx(i)
      setMetaResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r))
      try {
        const fetched = await autoFetchMetadata(
          { title: track.title, artist: track.artist, album: track.album },
          (steps) => setMetaResults((prev) => prev.map((r, idx) => idx === i ? { ...r, steps: [...steps] } : r))
        )
        const updates = applyFields(fetched, enabledFields)
        setMetaResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'done', updates } : r))
      } catch (err) {
        setMetaResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: String(err) } : r))
      }
    }
    setIsFetching(false)
    setMetaPhase('done')
  }

  async function handleSaveAll() {
    setIsSaving(true)
    for (const result of metaResults) {
      if (result.status !== 'done') continue
      const { track, updates } = result
      if (Object.keys(updates).length === 0) continue
      try {
        const payload = {
          path: track.path, format: track.format,
          title:        updates.title        ?? track.title,
          artist:       updates.artist       ?? track.artist,
          album:        updates.album        ?? track.album,
          album_artist: updates.albumArtist  ?? track.albumArtist,
          genre:        updates.genre        ?? track.genre,
          year:         updates.year         ?? track.year,
          track_number: track.trackNumber, disc_number: track.discNumber,
          duration:     track.duration,
          cover_art:    updates.coverArt  ?? track.coverArt  ?? null,
          bit_depth:    track.bitDepth    ?? null,
          sample_rate:  track.sampleRate, bitrate: track.bitrate, file_size: track.fileSize,
          lyrics:       updates.lyrics   ?? track.lyrics   ?? null,
          comment:      updates.comment  ?? track.comment  ?? null,
          composer:     updates.composer ?? track.composer ?? null,
        }
        await invoke('write_metadata', { path: track.path, metadata: payload })
        updateTrack(track.path, updates)
        setMetaResults((prev) => prev.map((r) => r.track.path === track.path ? { ...r, saved: true } : r))
      } catch (err) {
        setMetaResults((prev) =>
          prev.map((r) => r.track.path === track.path ? { ...r, error: String(err) } : r)
        )
      }
    }
    setIsSaving(false)
  }

  // ── Rename handler (in-place) ────────────────────────────────────────────────

  async function handleRenameFiles() {
    setRenamePhase('running')
    const results: FileOpResult[] = []
    const foundConflicts: RenameConflict[] = []
    const pending = new Map<string, RenameResult>()

    for (const track of selectedTracks) {
      const newName = applyPattern(filePattern, track)
      try {
        const res = await invoke<RenameResult>('rename_track', { path: track.path, newName })
        if (res.status === 'renamed') {
          renameTrackPath(track.path, res.new_path)
          results.push({ filename: track.path.split('/').pop() ?? track.path, newName: res.new_path.split('/').pop() ?? res.new_path, error: null })
        } else if (res.status === 'conflict') {
          pending.set(track.path, res)
          foundConflicts.push({
            originalPath: track.path,
            newPath: res.new_path,
            originalName: track.path.split('/').pop() ?? track.path,
            targetName: res.new_path.split('/').pop() ?? res.new_path,
            originalSize: res.original_size,
            existingSize: res.existing_size,
          })
        } else if (res.status === 'unchanged') {
          results.push({ filename: track.path.split('/').pop() ?? track.path, newName: null, error: null })
        } else {
          results.push({ filename: track.path.split('/').pop() ?? track.path, newName: null, error: res.error ?? 'Unknown error' })
        }
      } catch (err) {
        results.push({ filename: track.path.split('/').pop() ?? track.path, newName: null, error: String(err) })
      }
    }

    setRenameResults(results)
    if (foundConflicts.length > 0) {
      setPendingRenames(pending)
      setConflicts(foundConflicts)
      // stay in running phase until conflicts resolved
    } else {
      setRenamePhase('done')
    }
  }

  async function handleResolveConflicts(decisions: Map<string, 'overwrite' | 'skip'>) {
    const extra: FileOpResult[] = []
    for (const [originalPath, action] of decisions) {
      const res = pendingRenames.get(originalPath)
      if (!res) continue
      try {
        const finalPath = await invoke<string>('resolve_rename_conflict', {
          originalPath, targetPath: res.new_path, action,
        })
        if (action === 'overwrite') {
          renameTrackPath(originalPath, finalPath)
          extra.push({ filename: originalPath.split('/').pop() ?? originalPath, newName: finalPath.split('/').pop() ?? finalPath, error: null })
        } else {
          extra.push({ filename: originalPath.split('/').pop() ?? originalPath, newName: null, error: null })
        }
      } catch (err) {
        extra.push({ filename: originalPath.split('/').pop() ?? originalPath, newName: null, error: String(err) })
      }
    }
    setRenameResults((prev) => [...prev, ...extra])
    setConflicts([])
    setPendingRenames(new Map())
    setRenamePhase('done')
  }

  // ── Organize handler (move to folder structure) ──────────────────────────────

  async function handleOrganize() {
    setBaseDirError('')
    if (!baseDir.trim()) {
      setBaseDirError('Please select a destination folder')
      return
    }
    setOrganizePhase('running')
    setCleanedDirs(null)
    try {
      const originalDirs = [...new Set(selectedTracks.map((t) => t.path.substring(0, t.path.lastIndexOf('/'))))]
      const trackInfos = selectedTracks.map((t) => ({
        path: t.path, title: t.title, artist: t.artist, album: t.album,
        track_number: t.trackNumber, disc_number: t.discNumber, year: t.year, genre: t.genre,
      }))
      const res = await invoke<OrganizeResult[]>('organize_tracks', {
        tracks:        trackInfos,
        baseDir:       baseDir,
        folderPattern: folderPattern,
        filePattern:   filePattern,
        renameFiles:   false,          // keep original filename, only move to folders
      })
      for (const r of res) {
        if (r.new_path && r.new_path !== r.original_path) renameTrackPath(r.original_path, r.new_path)
      }
      setOrganizeResults(res.map((r) => ({
        filename: r.original_path.split('/').pop() ?? r.original_path,
        newName:  r.new_path ? r.new_path.replace(baseDir + '/', '') : null,
        error:    r.error,
      })))

      // Cleanup empty dirs left behind
      const cleaned = await invoke<number>('cleanup_empty_dirs', { dirs: originalDirs })
      setCleanedDirs(cleaned)
    } catch (err) {
      setOrganizeResults([{ filename: 'global', newName: null, error: String(err) }])
    }
    setOrganizePhase('done')
  }

  async function handlePickFolder() {
    const dir = await open({ directory: true, multiple: false, title: 'Choose destination folder' })
    if (dir && typeof dir === 'string') { setBaseDir(dir); setBaseDirError('') }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const doneCount  = metaResults.filter((r) => r.status === 'done').length
  const errorCount = metaResults.filter((r) => r.status === 'error').length
  const savedCount = metaResults.filter((r) => r.saved).length
  const hasUpdates = metaResults.some((r) => r.status === 'done' && Object.keys(r.updates).length > 0)

  return (
    <>
    {conflicts.length > 0 && (
      <ConflictModal
        conflicts={conflicts}
        onResolve={handleResolveConflicts}
        onCancel={() => { setConflicts([]); setPendingRenames(new Map()); setRenamePhase('done') }}
      />
    )}
    <aside className="editor-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Bulk Edit</h2>
          <p className="text-xs text-violet-400 mt-0.5">{selectedPaths.length} tracks selected</p>
        </div>
        <button onClick={clearSelection} className="text-zinc-500 hover:text-zinc-200 transition-colors duration-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        {([['metadata', 'Metadata', FileText], ['files', 'Files', FolderSymlink]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-all duration-200
              ${tab === id ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Metadata tab ───────────────────────────────────────────────────────── */}
      {tab === 'metadata' && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {metaPhase === 'config' && (
              <div className="glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-400">Fields to update</p>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => setEnabledFields(new Set(FIELD_OPTIONS.map((f) => f.key)))} className="text-zinc-500 hover:text-zinc-300 transition-colors">All</button>
                    <button onClick={() => setEnabledFields(new Set())} className="text-zinc-500 hover:text-zinc-300 transition-colors">None</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_OPTIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors select-none">
                      <input type="checkbox" checked={enabledFields.has(key)} onChange={() => toggleField(key)} className="w-3 h-3 rounded accent-violet-500 cursor-pointer" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {metaPhase !== 'config' && (
              <div className="glass-card space-y-2">
                {isFetching ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-accent" />Processing…</span>
                      <span className="text-zinc-500">{Math.min(currentIdx + 1, selectedTracks.length)} / {selectedTracks.length}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1">
                      <div className="bg-accent h-1 rounded-full transition-all duration-300" style={{ width: `${((currentIdx + 1) / selectedTracks.length) * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{metaPhase === 'done' ? 'Fetch complete' : ''}</span>
                    <span className="flex gap-3">
                      <span className="text-green-400">{doneCount} done</span>
                      {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                      {savedCount > 0 && <span className="text-violet-400">{savedCount} saved</span>}
                    </span>
                  </div>
                )}
              </div>
            )}

            {metaResults.length > 0 && (
              <div className="space-y-1.5">
                {metaResults.map((result) => {
                  const name = result.track.title || result.track.path.split('/').pop() || result.track.path
                  const updatedCount = Object.keys(result.updates).length
                  return (
                    <div key={result.track.path} className="glass-card !py-2 !px-3 space-y-1.5">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMetaResults((prev) => prev.map((r) => r.track.path === result.track.path ? { ...r, expanded: !r.expanded } : r))}>
                        <span className="shrink-0">
                          {result.status === 'pending' && <Clock       className="w-3.5 h-3.5 text-zinc-600" />}
                          {result.status === 'running' && <Loader2     className="w-3.5 h-3.5 text-accent animate-spin" />}
                          {result.status === 'done'    && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                          {result.status === 'error'   && <XCircle     className="w-3.5 h-3.5 text-red-500" />}
                        </span>
                        <span className="text-xs text-zinc-300 truncate flex-1">{name}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {result.saved && <span className="text-xs text-violet-400">saved</span>}
                          {result.status === 'done' && updatedCount > 0 && !result.saved && <span className="text-xs text-zinc-500">{updatedCount} fields</span>}
                          {result.steps.length > 0 && (result.expanded ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />)}
                        </span>
                      </div>
                      {result.error && !result.expanded && <p className="text-xs text-red-400 truncate pl-5">{result.error}</p>}
                      {result.expanded && result.steps.length > 0 && (
                        <div className="pl-5 space-y-1 border-t border-white/5 pt-1.5">
                          {result.steps.map((step) => (
                            <div key={step.id} className="flex items-start gap-1.5 text-xs">
                              <span className="mt-0.5">{stepIcon(step.status)}</span>
                              <div className="min-w-0">
                                <p className={step.status === 'running' ? 'text-zinc-300' : step.status === 'success' ? 'text-zinc-400' : step.status === 'error' ? 'text-red-400' : 'text-zinc-600'}>{step.label}</p>
                                {step.detail && <p className={`truncate ${step.status === 'error' ? 'text-red-500' : 'text-zinc-600'}`}>{step.detail}</p>}
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

          <div className="px-5 py-4 border-t border-white/5 shrink-0 space-y-2">
            {metaPhase === 'config' && (
              <button onClick={handleFetchAll} disabled={enabledFields.size === 0} className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40">
                <Sparkles className="w-4 h-4" />Auto-fetch All ({selectedTracks.length} tracks)
              </button>
            )}
            {metaPhase === 'fetching' && (
              <button disabled className="btn-primary w-full flex items-center justify-center gap-2 text-sm opacity-50">
                <Loader2 className="w-4 h-4 animate-spin" />Fetching… {Math.min(currentIdx + 1, selectedTracks.length)}/{selectedTracks.length}
              </button>
            )}
            {metaPhase === 'done' && (
              <>
                {hasUpdates && (
                  <button onClick={handleSaveAll} disabled={isSaving} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                    <Save className="w-4 h-4" />{isSaving ? 'Saving…' : `Save All (${doneCount - savedCount} pending)`}
                  </button>
                )}
                <button onClick={() => { setMetaResults([]); setMetaPhase('config'); setCurrentIdx(0) }} className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg text-zinc-500 hover:text-zinc-300 border border-white/10 hover:border-white/20 transition-all duration-200">
                  Fetch Again
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Files tab ──────────────────────────────────────────────────────────── */}
      {tab === 'files' && (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Section 1: Rename files in place ─────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-300">Rename Files</h3>
              <span className="text-xs text-zinc-600">— stays in current folder</span>
            </div>

            <div className="glass-card text-xs space-y-1">
              <span className="text-zinc-600">Pattern: </span>
              <span className="font-mono text-zinc-400">{filePattern}</span>
              <span className="text-zinc-700 ml-2">(edit in Settings)</span>
            </div>

            {renamePhase === 'idle' && (
              <div className="glass-card !p-0 overflow-hidden max-h-40 overflow-y-auto">
                {selectedTracks.slice(0, 10).map((t) => (
                  <div key={t.path} className="px-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
                    <p className="text-zinc-600 truncate font-mono">{t.path.split('/').pop()}</p>
                    <p className="text-accent truncate font-mono mt-0.5">→ {applyPattern(filePattern, t)}.{t.format}</p>
                  </div>
                ))}
                {selectedTracks.length > 10 && <p className="px-3 py-1.5 text-xs text-zinc-600">+{selectedTracks.length - 10} more…</p>}
              </div>
            )}

            {renamePhase === 'running' && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />Renaming files…
              </div>
            )}

            {renamePhase === 'done' && <ResultList results={renameResults} />}

            {renamePhase === 'idle' && (
              <button onClick={handleRenameFiles} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <FileEdit className="w-4 h-4" />Rename {selectedTracks.length} Files
              </button>
            )}
            {renamePhase === 'done' && (
              <button onClick={() => { setRenameResults([]); setRenamePhase('idle') }} className="w-full flex items-center justify-center text-xs py-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 border border-white/10 hover:border-white/20 transition-all duration-200">
                Reset
              </button>
            )}
          </section>

          <div className="border-t border-white/5" />

          {/* ── Section 2: Organize into folders ─────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderSymlink className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-300">Organize into Folders</h3>
              <span className="text-xs text-zinc-600">— keeps filename as-is</span>
            </div>

            <div className="glass-card text-xs space-y-1">
              <span className="text-zinc-600">Folder pattern: </span>
              <span className="font-mono text-zinc-400">{folderPattern}</span>
              <span className="text-zinc-700 ml-2">(edit in Settings)</span>
            </div>

            {organizePhase === 'idle' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500">Destination folder</label>
                  <div className="flex gap-2">
                    <div className={`flex-1 px-3 py-2 bg-white/5 border rounded-lg text-xs truncate font-mono
                      ${baseDirError ? 'border-red-500/50 text-red-400' : 'border-white/10 text-zinc-400'}`}>
                      {baseDir || 'No folder selected'}
                    </div>
                    <button onClick={handlePickFolder} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-all duration-200 shrink-0">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {baseDirError && <p className="text-xs text-red-400">{baseDirError}</p>}
                </div>

                <div className="glass-card !p-0 overflow-hidden max-h-40 overflow-y-auto">
                  {selectedTracks.slice(0, 8).map((t) => {
                    const folder = folderPattern.split('/').map((p) => applyFolderPattern(p, t)).filter(Boolean).join('/')
                    const fname  = t.path.split('/').pop() ?? t.path
                    return (
                      <div key={t.path} className="px-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
                        <p className="text-zinc-600 truncate font-mono">{fname}</p>
                        <p className="text-accent truncate font-mono mt-0.5">→ {folder}/{fname}</p>
                      </div>
                    )
                  })}
                  {selectedTracks.length > 8 && <p className="px-3 py-1.5 text-xs text-zinc-600">+{selectedTracks.length - 8} more…</p>}
                </div>
              </>
            )}

            {organizePhase === 'running' && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />Moving files…
              </div>
            )}

            {organizePhase === 'done' && (
              <div className="space-y-2">
                <ResultList results={organizeResults} />
                {cleanedDirs !== null && cleanedDirs > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Trash2 className="w-3 h-3" />{cleanedDirs} empty folder{cleanedDirs !== 1 ? 's' : ''} removed
                  </div>
                )}
              </div>
            )}

            {organizePhase === 'idle' && (
              <button onClick={handleOrganize} className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg border border-white/10 hover:border-accent/40 text-zinc-400 hover:text-zinc-200 transition-all duration-200">
                <FolderSymlink className="w-4 h-4" />Organize {selectedTracks.length} Tracks into Folders
              </button>
            )}
            {organizePhase === 'done' && (
              <button onClick={() => { setOrganizeResults([]); setOrganizePhase('idle'); setCleanedDirs(null) }} className="w-full flex items-center justify-center text-xs py-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 border border-white/10 hover:border-white/20 transition-all duration-200">
                Reset
              </button>
            )}
          </section>
        </div>
      )}
    </aside>
    </>
  )
}
