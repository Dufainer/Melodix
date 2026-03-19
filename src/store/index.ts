import { create } from 'zustand'
import { Track } from '../types'

const DEFAULT_FILE_PATTERN   = '{track} - {title}'
const DEFAULT_FOLDER_PATTERN = '{artist}/{album}'

interface LibraryState {
  tracks: Track[]
  selectedTrack: Track | null
  selectedPaths: string[]
  isScanning: boolean
  searchQuery: string
  activeFormat: string | null
  filePattern: string
  folderPattern: string

  setTracks: (tracks: Track[]) => void
  addTracks: (tracks: Track[]) => void
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
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  selectedTrack: null,
  selectedPaths: [],
  isScanning: false,
  searchQuery: '',
  activeFormat: null,
  filePattern:   localStorage.getItem('filePattern')   ?? DEFAULT_FILE_PATTERN,
  folderPattern: localStorage.getItem('folderPattern') ?? DEFAULT_FOLDER_PATTERN,

  setTracks: (tracks) => set({ tracks }),

  addTracks: (tracks) =>
    set((state) => ({
      tracks: [
        ...state.tracks,
        ...tracks.filter((t) => !state.tracks.some((e) => e.path === t.path)),
      ],
    })),

  selectTrack: (track) => set({ selectedTrack: track }),

  updateTrack: (path, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.path === path ? { ...t, ...updates } : t)),
      selectedTrack:
        state.selectedTrack?.path === path
          ? { ...state.selectedTrack, ...updates }
          : state.selectedTrack,
    })),

  renameTrackPath: (oldPath, newPath) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
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
}))
