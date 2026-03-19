import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { Info, FolderOpen, X } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { useLibraryStore } from '../store'
import { buildPreviewPath } from '../services/fileOps'

const VARS = ['{title}', '{artist}', '{album}', '{track}', '{disc}', '{year}', '{genre}']

const PREVIEW_TRACK = {
  title: 'Another Brick in the Wall',
  artist: 'Pink Floyd',
  album: 'The Wall',
  trackNumber: 1,
  discNumber: 0,
  year: 1979,
  genre: 'Rock',
}

function PatternInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                   font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                   transition-all duration-200"
      />
    </div>
  )
}

export default function Settings() {
  const [supportedFormats, setSupportedFormats] = useState<string[]>([])
  const { filePattern, folderPattern, setFilePattern, setFolderPattern, musicFolder, setMusicFolder } = useLibraryStore()

  async function handlePickMusicFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Select Music Folder' })
    if (selected && typeof selected === 'string') {
      setMusicFolder(selected)
    }
  }

  useEffect(() => {
    invoke<string[]>('get_supported_formats').then(setSupportedFormats).catch(console.error)
  }, [])

  const preview = buildPreviewPath(folderPattern, filePattern, PREVIEW_TRACK, 'flac')

  return (
    <div className="px-8 py-8 max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* Music Library */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Music Library</h2>
        <div className="glass-card space-y-3">
          <p className="text-xs text-zinc-500">Folder scanned by the Player. Select the root folder where all your music is stored.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono truncate text-zinc-400">
              {musicFolder ?? <span className="text-zinc-600">Not set</span>}
            </div>
            {musicFolder && (
              <button
                onClick={() => setMusicFolder('')}
                className="p-2 text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handlePickMusicFolder}
              className="flex items-center gap-2 px-3 py-2 text-sm btn-primary shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
              {musicFolder ? 'Change' : 'Select'}
            </button>
          </div>
        </div>
      </section>

      {/* File Naming */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">File Naming</h2>
        <div className="glass-card space-y-4">
          <PatternInput
            label="Folder structure"
            value={folderPattern}
            onChange={setFolderPattern}
          />
          <PatternInput
            label="File name"
            value={filePattern}
            onChange={setFilePattern}
          />

          {/* Variable chips */}
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-600">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {VARS.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-xs font-mono text-accent"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-1">
            <p className="text-xs text-zinc-600">Preview</p>
            <p className="text-xs font-mono text-zinc-400 bg-white/5 rounded px-3 py-2 break-all">
              {preview}
            </p>
          </div>
        </div>
      </section>

      {/* Supported Formats */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Supported Formats</h2>
        <div className="glass-card">
          <div className="flex flex-wrap gap-2">
            {supportedFormats.length === 0
              ? <p className="text-sm text-zinc-500">Loading…</p>
              : supportedFormats.map((ext) => (
                  <span key={ext} className="format-badge bg-accent/15 text-accent border-accent/30">
                    {ext.toUpperCase()}
                  </span>
                ))
            }
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Additional formats (MP3, AAC, OGG, OPUS, WAV, AIFF) are on the roadmap.
          </p>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">About</h2>
        <div className="glass-card flex items-start gap-3">
          <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <div className="text-sm text-zinc-400 space-y-1">
            <p>Melodix v0.1.0</p>
            <p className="text-zinc-600 text-xs">
              Built with Tauri v2 + React 19 + TypeScript + TailwindCSS v4
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
