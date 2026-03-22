import { FolderOpen, RefreshCw, Search } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { useLibraryStore } from '../store'
import { RawTrack, rawToTrack } from '../types'

export default function Toolbar() {
  const { isScanning, searchQuery, setEditorTracks, setScanning, setSearchQuery } = useLibraryStore()

  async function handleScanFolder() {
    const selected = await open({ directory: true, multiple: false, title: 'Select Music Folder' })
    if (!selected || typeof selected !== 'string') return

    setScanning(true)
    try {
      const raw: RawTrack[] = await invoke('scan_folder', { path: selected })
      setEditorTracks(raw.map(rawToTrack))
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  return (
    <header className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-surface/80 backdrop-blur-sm shrink-0">
      <button
        className="btn-primary flex items-center gap-2 text-sm"
        onClick={handleScanFolder}
        disabled={isScanning}
      >
        {isScanning ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <FolderOpen className="w-4 h-4" />
        )}
        {isScanning ? 'Scanning…' : 'Open Folder'}
      </button>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search library…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200
                     placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                     transition-all duration-200"
        />
      </div>
    </header>
  )
}
