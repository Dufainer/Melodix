export type AudioFormat = 'flac' | 'mp3' | 'aac' | 'ogg' | 'opus' | 'wav' | 'aiff'

export interface Track {
  path: string
  format: AudioFormat
  title: string
  artist: string
  album: string
  albumArtist: string
  genre: string
  year: number
  trackNumber: number
  discNumber: number
  duration: number
  coverArt?: string
  bitDepth?: number
  sampleRate: number
  bitrate: number
  fileSize: number
  lyrics?: string
  comment?: string
  composer?: string
  replayGainTrack?: number
  replayGainAlbum?: number
  fileModified?: number
}

export type FetchStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface FetchStep {
  id: string
  label: string
  status: FetchStepStatus
  detail?: string
}

export interface FetchResult {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  coverArt?: string
  lyrics?: string
  comment?: string
  composer?: string
}

export interface OrganizeResult {
  original_path: string
  new_path: string | null
  error: string | null
}

export interface RenameResult {
  original_path: string
  new_path: string
  status: 'renamed' | 'conflict' | 'unchanged' | 'error'
  original_size: number
  existing_size: number
  error: string | null
}
