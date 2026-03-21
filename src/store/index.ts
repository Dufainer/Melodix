import { create } from 'zustand'
import { Track } from '../types'

const DEFAULT_FILE_PATTERN   = '{track} - {title}'
const DEFAULT_FOLDER_PATTERN = '{artist}/{album}'

type RepeatMode = 'off' | 'one' | 'all'

export interface Playlist {
  id: string
  name: string
  trackPaths: string[]
  createdAt: number
}

export interface PlayEvent {
  path: string
  timestamp: number
  duration: number
}

interface LibraryState {
  tracks: Track[]         // main player library (from musicFolder in Settings)
  editorTracks: Track[]  // tracks loaded in the Tag Editor (independent folder)
  selectedTrack: Track | null
  selectedPaths: string[]
  isScanning: boolean
  searchQuery: string
  activeFormat: string | null
  filePattern: string
  folderPattern: string
  musicFolders: string[]
  likedPaths: string[]
  playlists: Playlist[]
  recentlyPlayed: string[]
  playHistory: PlayEvent[]

  // Player
  playerTrack: Track | null
  isPlaying: boolean
  playerQueue: Track[]
  repeatMode: RepeatMode
  shuffleOn: boolean
  playKey: number
  position: number
  duration: number
  nowPlayingOpen: boolean
  lastSeekAt: number

  setTracks: (tracks: Track[]) => void
  addTracks: (tracks: Track[]) => void
  setEditorTracks: (tracks: Track[]) => void
  selectTrack: (track: Track | null) => void
  updateTrack: (path: string, updates: Partial<Track>) => void
  renameTrackPath: (oldPath: string, newPath: string) => void
  setScanning: (scanning: boolean) => void
  setSearchQuery: (query: string) => void
  setActiveFormat: (format: string | null) => void
  toggleSelection: (path: string) => void
  selectAllFiltered: (paths: string[]) => void
  clearSelection: () => void
  setFilePattern: (pattern: string) => void
  setFolderPattern: (pattern: string) => void
  addMusicFolder: (path: string) => void
  removeMusicFolder: (path: string) => void
  toggleLike: (path: string) => void
  recordPlay: (path: string, duration: number) => void
  createPlaylist: (name: string) => string
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addToPlaylist: (id: string, path: string) => void
  removeFromPlaylist: (id: string, path: string) => void

  // Player actions
  playTrack: (track: Track, queue: Track[]) => void
  setIsPlaying: (playing: boolean) => void
  playNext: () => void
  playPrev: () => void
  setRepeatMode: (mode: RepeatMode) => void
  toggleShuffle: () => void
  setPosition: (pos: number) => void
  setDuration: (dur: number) => void
  setNowPlayingOpen: (open: boolean) => void
  markSeeked: () => void
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (from: number, to: number) => void
  clearQueue: () => void

  // Playback settings
  crossfadeDuration: number        // seconds, 0 = disabled
  sleepTimerEndsAt: number | null  // ms timestamp, null = inactive
  replayGainMode: 'off' | 'track' | 'album'
  setCrossfadeDuration: (seconds: number) => void
  setSleepTimer: (minutes: number | null) => void
  setReplayGainMode: (mode: 'off' | 'track' | 'album') => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  editorTracks: [],
  selectedTrack: null,
  selectedPaths: [],
  isScanning: false,
  searchQuery: '',
  activeFormat: null,
  filePattern:   localStorage.getItem('filePattern')   ?? DEFAULT_FILE_PATTERN,
  folderPattern: localStorage.getItem('folderPattern') ?? DEFAULT_FOLDER_PATTERN,
  musicFolders: (() => {
    const stored = localStorage.getItem('musicFolders')
    if (stored) return JSON.parse(stored) as string[]
    // migrate from old single-folder key
    const old = localStorage.getItem('musicFolder')
    return old ? [old] : []
  })(),

  playerTrack: null,
  isPlaying: false,
  playerQueue: [],
  repeatMode: (localStorage.getItem('repeatMode') as RepeatMode) ?? 'off',
  shuffleOn: localStorage.getItem('shuffleOn') === 'true',
  playKey: 0,
  position: 0,
  duration: 0,
  nowPlayingOpen: false,
  lastSeekAt: 0,
  queueOpen: false,
  likedPaths: JSON.parse(localStorage.getItem('likedPaths') ?? '[]'),
  playlists: JSON.parse(localStorage.getItem('playlists') ?? '[]'),
  recentlyPlayed: JSON.parse(localStorage.getItem('recentlyPlayed') ?? '[]'),
  playHistory: JSON.parse(localStorage.getItem('playHistory') ?? '[]'),

  setTracks: (tracks) => set({ tracks }),

  addTracks: (tracks) =>
    set((state) => ({
      tracks: [
        ...state.tracks,
        ...tracks.filter((t) => !state.tracks.some((e) => e.path === t.path)),
      ],
    })),

  setEditorTracks: (editorTracks) => set({ editorTracks }),

  selectTrack: (track) => set({ selectedTrack: track }),

  updateTrack: (path, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.path === path ? { ...t, ...updates } : t)),
      editorTracks: state.editorTracks.map((t) => (t.path === path ? { ...t, ...updates } : t)),
      selectedTrack:
        state.selectedTrack?.path === path
          ? { ...state.selectedTrack, ...updates }
          : state.selectedTrack,
      playerTrack:
        state.playerTrack?.path === path
          ? { ...state.playerTrack, ...updates }
          : state.playerTrack,
    })),

  renameTrackPath: (oldPath, newPath) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.path === oldPath ? { ...t, path: newPath } : t
      ),
      editorTracks: state.editorTracks.map((t) =>
        t.path === oldPath ? { ...t, path: newPath } : t
      ),
      selectedTrack:
        state.selectedTrack?.path === oldPath
          ? { ...state.selectedTrack, path: newPath }
          : state.selectedTrack,
      selectedPaths: state.selectedPaths.map((p) => (p === oldPath ? newPath : p)),
    })),

  setScanning: (isScanning) => set({ isScanning }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFormat: (activeFormat) => set({ activeFormat }),

  toggleSelection: (path) =>
    set((state) => ({
      selectedPaths: state.selectedPaths.includes(path)
        ? state.selectedPaths.filter((p) => p !== path)
        : [...state.selectedPaths, path],
    })),

  selectAllFiltered: (paths) => set({ selectedPaths: paths }),
  clearSelection: () => set({ selectedPaths: [] }),

  setFilePattern: (pattern) => {
    localStorage.setItem('filePattern', pattern)
    set({ filePattern: pattern })
  },
  setFolderPattern: (pattern) => {
    localStorage.setItem('folderPattern', pattern)
    set({ folderPattern: pattern })
  },
  addMusicFolder: (path) => {
    const next = get().musicFolders.includes(path)
      ? get().musicFolders
      : [...get().musicFolders, path]
    localStorage.setItem('musicFolders', JSON.stringify(next))
    set({ musicFolders: next })
  },

  removeMusicFolder: (path) => {
    const next = get().musicFolders.filter(f => f !== path)
    localStorage.setItem('musicFolders', JSON.stringify(next))
    set({ musicFolders: next })
  },

  playTrack: (track, queue) => {
    const { recentlyPlayed } = get()
    const next = [track.path, ...recentlyPlayed.filter((p) => p !== track.path)].slice(0, 30)
    localStorage.setItem('recentlyPlayed', JSON.stringify(next))
    set({ playerTrack: track, isPlaying: true, playerQueue: queue, recentlyPlayed: next })
  },

  recordPlay: (path, duration) => {
    const { playHistory } = get()
    const event: PlayEvent = { path, timestamp: Date.now(), duration }
    const next = [...playHistory, event].slice(-5000)
    localStorage.setItem('playHistory', JSON.stringify(next))
    set({ playHistory: next })
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  playNext: () => {
    const { playerQueue, playerTrack, repeatMode, shuffleOn, playKey } = get()
    if (repeatMode === 'one') {
      set({ playKey: playKey + 1 })
      return
    }
    if (shuffleOn && playerQueue.length > 1) {
      const others = playerQueue.filter((t) => t.path !== playerTrack?.path)
      const next = others[Math.floor(Math.random() * others.length)]
      set({ playerTrack: next, isPlaying: true })
      return
    }
    const idx = playerQueue.findIndex((t) => t.path === playerTrack?.path)
    const next = playerQueue[idx + 1] ?? (repeatMode === 'all' ? playerQueue[0] : null)
    if (next) set({ playerTrack: next, isPlaying: true })
  },

  playPrev: () => {
    const { playerQueue, playerTrack, repeatMode } = get()
    const idx = playerQueue.findIndex((t) => t.path === playerTrack?.path)
    const prev = playerQueue[idx - 1] ?? (repeatMode === 'all' ? playerQueue[playerQueue.length - 1] : null)
    if (prev) set({ playerTrack: prev, isPlaying: true })
  },

  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setNowPlayingOpen: (nowPlayingOpen) => set({ nowPlayingOpen }),
  markSeeked: () => set({ lastSeekAt: Date.now() }),

  crossfadeDuration: Number(localStorage.getItem('crossfadeDuration') ?? 0),
  sleepTimerEndsAt: null,
  replayGainMode: (localStorage.getItem('replayGainMode') as 'off' | 'track' | 'album') ?? 'track',

  setCrossfadeDuration: (seconds) => {
    localStorage.setItem('crossfadeDuration', String(seconds))
    set({ crossfadeDuration: seconds })
  },

  setSleepTimer: (minutes) => {
    set({ sleepTimerEndsAt: minutes === null ? null : Date.now() + minutes * 60 * 1000 })
  },

  setReplayGainMode: (mode) => {
    localStorage.setItem('replayGainMode', mode)
    set({ replayGainMode: mode })
  },

  setQueueOpen: (queueOpen) => set({ queueOpen }),

  addToQueue: (track) => set((state) => {
    if (state.playerQueue.some(t => t.path === track.path)) return state
    return { playerQueue: [...state.playerQueue, track] }
  }),

  removeFromQueue: (index) => {
    const next = [...get().playerQueue]
    next.splice(index, 1)
    set({ playerQueue: next })
  },

  reorderQueue: (from, to) => {
    const next = [...get().playerQueue]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    set({ playerQueue: next })
  },

  clearQueue: () => {
    const { playerQueue, playerTrack } = get()
    // Keep only the currently playing track
    const current = playerQueue.find(t => t.path === playerTrack?.path)
    set({ playerQueue: current ? [current] : [] })
  },

  setRepeatMode: (repeatMode) => {
    localStorage.setItem('repeatMode', repeatMode)
    set({ repeatMode })
  },

  toggleShuffle: () => {
    const next = !get().shuffleOn
    localStorage.setItem('shuffleOn', String(next))
    set({ shuffleOn: next })
  },

  toggleLike: (path) => {
    const liked = get().likedPaths
    const next = liked.includes(path) ? liked.filter((p) => p !== path) : [...liked, path]
    localStorage.setItem('likedPaths', JSON.stringify(next))
    set({ likedPaths: next })
  },

  createPlaylist: (name) => {
    const id = `pl_${Date.now()}`
    const next = [...get().playlists, { id, name, trackPaths: [], createdAt: Date.now() }]
    localStorage.setItem('playlists', JSON.stringify(next))
    set({ playlists: next })
    return id
  },

  deletePlaylist: (id) => {
    const next = get().playlists.filter((p) => p.id !== id)
    localStorage.setItem('playlists', JSON.stringify(next))
    set({ playlists: next })
  },

  renamePlaylist: (id, name) => {
    const next = get().playlists.map((p) => p.id === id ? { ...p, name } : p)
    localStorage.setItem('playlists', JSON.stringify(next))
    set({ playlists: next })
  },

  addToPlaylist: (id, path) => {
    const next = get().playlists.map((p) =>
      p.id === id && !p.trackPaths.includes(path)
        ? { ...p, trackPaths: [...p.trackPaths, path] }
        : p
    )
    localStorage.setItem('playlists', JSON.stringify(next))
    set({ playlists: next })
  },

  removeFromPlaylist: (id, path) => {
    const next = get().playlists.map((p) =>
      p.id === id ? { ...p, trackPaths: p.trackPaths.filter((tp) => tp !== path) } : p
    )
    localStorage.setItem('playlists', JSON.stringify(next))
    set({ playlists: next })
  },
}))
