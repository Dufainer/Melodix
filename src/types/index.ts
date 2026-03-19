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
}

export interface SearchResult {
  mbid: string
  releaseMbid?: string
  title: string
  artist: string
  album: string
  year: number
  coverUrl?: string
  genre?: string
}

export interface MusicBrainzRelease {
  id: string
  title: string
  date?: string
  'artist-credit'?: Array<{
    artist: { name: string }
  }>
  'cover-art-archive'?: { front: boolean }
}

export interface DiscogsRelease {
  id: number
  title: string
  year?: number
  thumb?: string
  cover_image?: string
  artists?: Array<{ name: string }>
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
