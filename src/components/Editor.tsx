import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Save, Sparkles, AlertCircle, CheckCircle, FileEdit } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track, FetchStep } from '../types'
import CoverArt from './CoverArt'
import FetchProgress from './FetchProgress'
import { autoFetchMetadata } from '../services/autoFetch'
import { applyPattern } from '../services/fileOps'

type FieldKey = keyof Pick<Track, 'title' | 'artist' | 'album' | 'albumArtist' | 'trackNumber' | 'discNumber' | 'year' | 'genre' | 'composer'>

const FIELDS: Array<{ key: FieldKey; label: string; type?: string }> = [
  { key: 'title',       label: 'Title' },
  { key: 'artist',      label: 'Artist' },
  { key: 'album',       label: 'Album' },
  { key: 'albumArtist', label: 'Album Artist' },
  { key: 'trackNumber', label: 'Track Number', type: 'number' },
  { key: 'discNumber',  label: 'Disc Number',  type: 'number' },
  { key: 'year',        label: 'Year',         type: 'number' },
  { key: 'genre',       label: 'Genre' },
  { key: 'composer',    label: 'Composer' },
]

type Status = { type: 'idle' } | { type: 'saving' } | { type: 'success' } | { type: 'error'; msg: string }
type RenameStatus = { type: 'idle' } | { type: 'success' } | { type: 'error'; msg: string }

export default function Editor() {
  const { selectedTrack, updateTrack, renameTrackPath, selectTrack, filePattern } = useLibraryStore()
  const [form, setForm] = useState<Partial<Track>>({})
  const [status, setStatus] = useState<Status>({ type: 'idle' })
  const [fetchSteps, setFetchSteps] = useState<FetchStep[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [renameStatus, setRenameStatus] = useState<RenameStatus>({ type: 'idle' })

  useEffect(() => {
    if (selectedTrack) setForm({ ...selectedTrack })
    setStatus({ type: 'idle' })
    setFetchSteps(null)
  }, [selectedTrack])

  if (!selectedTrack) return null

  function setField(key: FieldKey, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!selectedTrack) return
    setStatus({ type: 'saving' })
    try {
      const payload = {
        path: selectedTrack.path,
        format: selectedTrack.format,
        title: form.title ?? '',
        artist: form.artist ?? '',
        album: form.album ?? '',
        album_artist: form.albumArtist ?? '',
        genre: form.genre ?? '',
        year: form.year ?? 0,
        track_number: form.trackNumber ?? 0,
        disc_number: form.discNumber ?? 0,
        duration: selectedTrack.duration,
        cover_art: form.coverArt ?? null,
        bit_depth: selectedTrack.bitDepth ?? null,
        sample_rate: selectedTrack.sampleRate,
        bitrate: selectedTrack.bitrate,
        file_size: selectedTrack.fileSize,
        lyrics: form.lyrics ?? null,
        comment: form.comment ?? null,
        composer: form.composer ?? null,
      }
      await invoke('write_metadata', { path: selectedTrack.path, metadata: payload })
      updateTrack(selectedTrack.path, form)
      setStatus({ type: 'success' })
      setTimeout(() => setStatus({ type: 'idle' }), 2500)
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) })
    }
  }

  async function handleAutoFetch() {
    setFetching(true)
    setFetchSteps(null)

    const query = {
      title: form.title ?? selectedTrack?.title ?? '',
      artist: form.artist ?? selectedTrack?.artist ?? '',
      album: form.album ?? selectedTrack?.album ?? '',
    }

    try {
      await autoFetchMetadata(query, (steps, partial) => {
        setFetchSteps([...steps])
        // Apply results to form as they arrive
        setForm((prev) => {
          const next = { ...prev }
          if (partial.title)      next.title      = partial.title
          if (partial.artist)     next.artist     = partial.artist
          if (partial.album)      next.album      = partial.album
          if (partial.albumArtist)next.albumArtist = partial.albumArtist
          if (partial.genre)      next.genre      = partial.genre
          if (partial.year)       next.year       = partial.year
          if (partial.coverArt)   next.coverArt   = partial.coverArt
          if (partial.lyrics)     next.lyrics     = partial.lyrics
          if (partial.comment)    next.comment    = partial.comment
          if (partial.composer)   next.composer   = partial.composer
          return next
        })
      })
    } finally {
      setFetching(false)
    }
  }

  async function handleRenameFile() {
    if (!selectedTrack) return
    const newName = applyPattern(filePattern, form)
    setRenameStatus({ type: 'idle' })
    try {
      const newPath = await invoke<string>('rename_track', {
        path: selectedTrack.path,
        newName,
      })
      renameTrackPath(selectedTrack.path, newPath)
      setRenameStatus({ type: 'success' })
      setTimeout(() => setRenameStatus({ type: 'idle' }), 2500)
    } catch (err) {
      setRenameStatus({ type: 'error', msg: String(err) })
    }
  }

  const isDone = fetchSteps !== null && fetchSteps.every((s) => s.status !== 'pending' && s.status !== 'running')

  return (
    <aside className="editor-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-200">Edit Metadata</h2>
        <button
          onClick={() => selectTrack(null)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Cover art */}
        <CoverArt src={form.coverArt} size="lg" className="rounded-xl" />

        {/* Auto-fetch button */}
        <button
          onClick={handleAutoFetch}
          disabled={fetching}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg
                     bg-accent/10 hover:bg-accent/20 border border-accent/20
                     text-sm text-accent font-medium
                     transition-all duration-200 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {fetching ? 'Fetching metadata…' : 'Auto-fetch All Metadata'}
        </button>

        {/* Progress panel */}
        {fetchSteps && (
          <FetchProgress steps={fetchSteps} />
        )}

        {/* Done message */}
        {isDone && (
          <p className="text-xs text-zinc-500 text-center">
            Done — results applied to fields below. Review and save.
          </p>
        )}

        {/* Metadata fields */}
        <div className="space-y-3">
          {FIELDS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
              <input
                type={type ?? 'text'}
                value={String(form[key] ?? '')}
                onChange={(e) =>
                  setField(key, type === 'number' ? parseInt(e.target.value || '0', 10) : e.target.value)
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                           focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                           transition-all duration-200"
              />
            </div>
          ))}

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Comment</label>
            <input
              type="text"
              value={form.comment ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                         focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                         transition-all duration-200"
            />
          </div>

          {/* Lyrics */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Lyrics</label>
            <textarea
              value={form.lyrics ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, lyrics: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                         focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                         transition-all duration-200 resize-y font-mono leading-relaxed"
              placeholder="No lyrics"
            />
          </div>
        </div>

        {/* Read-only info */}
        <div className="glass-card text-xs space-y-1 text-zinc-500">
          <p><span className="text-zinc-400">Format:</span> {selectedTrack.format.toUpperCase()}</p>
          {selectedTrack.sampleRate > 0 && (
            <p><span className="text-zinc-400">Sample rate:</span> {(selectedTrack.sampleRate / 1000).toFixed(1)} kHz</p>
          )}
          {selectedTrack.bitDepth && (
            <p><span className="text-zinc-400">Bit depth:</span> {selectedTrack.bitDepth}-bit</p>
          )}
          {selectedTrack.bitrate > 0 && (
            <p><span className="text-zinc-400">Bitrate:</span> {selectedTrack.bitrate} kbps</p>
          )}
          <p><span className="text-zinc-400">Size:</span> {(selectedTrack.fileSize / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0 space-y-2">
        {status.type === 'error' && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {status.msg}
          </div>
        )}
        {status.type === 'success' && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Saved successfully
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={status.type === 'saving'}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Save className="w-4 h-4" />
          {status.type === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Rename file */}
        <div className="pt-1 border-t border-white/5 space-y-1.5">
          <p className="text-xs text-zinc-600 truncate font-mono">
            → {applyPattern(filePattern, form)}.{selectedTrack.format}
          </p>
          {renameStatus.type === 'error' && (
            <p className="text-xs text-red-400 truncate">{renameStatus.msg}</p>
          )}
          {renameStatus.type === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" /> File renamed
            </div>
          )}
          <button
            onClick={handleRenameFile}
            className="w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded-lg
                       border border-white/10 hover:border-white/20
                       text-zinc-500 hover:text-zinc-300 transition-all duration-200"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Rename File
          </button>
        </div>
      </div>
    </aside>
  )
}
