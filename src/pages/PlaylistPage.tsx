import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Shuffle, Trash2, Music2, GripVertical, Download, Upload } from 'lucide-react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { useLibraryStore } from '../store'
import CoverArt from '../components/CoverArt'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playlists, tracks, playTrack, playerTrack, isPlaying, setIsPlaying,
          deletePlaylist, renamePlaylist, removeFromPlaylist, createPlaylist, addToPlaylist } = useLibraryStore()

  const playlist = playlists.find((p) => p.id === id)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(playlist?.name ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemovePath, setConfirmRemovePath] = useState<string | null>(null)

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
        <Music2 className="w-12 h-12 opacity-20" />
        <p className="text-sm">Playlist not found</p>
      </div>
    )
  }

  const playlistTracks = playlist.trackPaths
    .map((path) => tracks.find((t) => t.path === path))
    .filter(Boolean) as typeof tracks

  const totalDuration = playlistTracks.reduce((s, t) => s + (t.duration ?? 0), 0)
  const totalMin = Math.floor(totalDuration / 60)

  function handlePlay(index: number) {
    const track = playlistTracks[index]
    if (!track) return
    if (playerTrack?.path === track.path) {
      setIsPlaying(!isPlaying)
    } else {
      playTrack(track, playlistTracks)
    }
  }

  function handleShuffle() {
    if (playlistTracks.length === 0) return
    const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
  }

  function handleDelete() {
    deletePlaylist(playlist!.id)
    navigate('/player')
  }

  async function handleExport() {
    if (!playlist) return
    const lines = ['#EXTM3U']
    for (const track of playlistTracks) {
      const duration = Math.round(track.duration ?? 0)
      const label = [track.artist, track.title].filter(Boolean).join(' - ') || track.path.split('/').pop() || ''
      lines.push(`#EXTINF:${duration},${label}`)
      lines.push(track.path)
    }
    const filePath = await save({
      defaultPath: `${playlist.name}.m3u8`,
      filters: [{ name: 'Playlist', extensions: ['m3u8', 'm3u'] }],
    })
    if (filePath) await writeTextFile(filePath, lines.join('\n'))
  }

  async function handleImport() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Playlist', extensions: ['m3u8', 'm3u'] }],
      title: 'Import playlist',
    })
    if (!selected || typeof selected !== 'string') return
    const content = await readTextFile(selected)
    const paths = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
    if (paths.length === 0) return
    const fileName = selected.split('/').pop()?.replace(/\.(m3u8?)/i, '') ?? 'Imported'
    const newId = createPlaylist(fileName)
    paths.forEach(path => addToPlaylist(newId, path))
    navigate(`/playlist/${newId}`)
  }

  function commitRename() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== playlist!.name) renamePlaylist(playlist!.id, trimmed)
    setEditingName(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-2xl font-bold bg-transparent border-b border-accent text-zinc-100 outline-none w-full"
              />
            ) : (
              <h1
                className="text-2xl font-bold text-zinc-100 truncate cursor-pointer hover:text-white"
                onDoubleClick={() => { setNameValue(playlist.name); setEditingName(true) }}
                title="Double-click to rename"
              >
                {playlist.name}
              </h1>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              {playlistTracks.length} song{playlistTracks.length !== 1 ? 's' : ''}
              {totalMin > 0 ? ` · ${totalMin} min` : ''}
              {playlistTracks.length < playlist.trackPaths.length && (
                <span className="text-zinc-600"> · {playlist.trackPaths.length - playlistTracks.length} unavailable</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleImport}
              title="Import .m3u8"
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
            >
              <Upload className="w-4 h-4" />
            </button>
            {playlistTracks.length > 0 && (
              <button
                onClick={handleExport}
                title="Export as .m3u8"
                className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-400">Delete playlist?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Delete playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {playlistTracks.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handlePlay(0)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-all shadow-lg shadow-accent/20"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 text-zinc-300 text-sm font-semibold transition-all"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto py-2 px-3">
        {playlistTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 py-16">
            <Music2 className="w-12 h-12 opacity-20" />
            <p className="text-sm text-zinc-500">No songs yet</p>
            <p className="text-xs text-zinc-600">Add songs from the Songs, Albums, or Artists view</p>
          </div>
        ) : (
          playlistTracks.map((track, i) => {
            const active = playerTrack?.path === track.path
            return (
              <div
                key={track.path}
                onClick={() => handlePlay(i)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  active ? 'bg-accent/15' : 'hover:bg-white/5'
                }`}
              >
                <GripVertical className="w-4 h-4 text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100" />
                <CoverArt src={track.coverArt} path={track.path} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${active ? 'text-accent' : 'text-zinc-200'}`}>
                    {track.title || track.path.split('/').pop()}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{track.artist || 'Unknown Artist'}</p>
                </div>
                {track.duration > 0 && (
                  <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatDuration(track.duration)}</span>
                )}
                {confirmRemovePath === track.path ? (
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { removeFromPlaylist(playlist.id, track.path); setConfirmRemovePath(null) }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmRemovePath(null)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-zinc-400 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmRemovePath(track.path) }}
                    className="shrink-0 p-1.5 rounded-lg text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
