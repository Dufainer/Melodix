export type AudioFormat = 'flac' | 'mp3' | 'aac' | 'ogg' | 'opus' | 'wav' | 'aiff'

export interface RawTrack {
  path: string; format: string; title?: string; artist?: string; album?: string
  album_artist?: string; genre?: string; year?: number; track_number?: number
  disc_number?: number; duration?: number; cover_art?: string; bit_depth?: number
  sample_rate?: number; bitrate?: number; file_size?: number
  replay_gain_track?: number; replay_gain_album?: number
  lyrics?: string; comment?: string; composer?: string; file_modified?: number
}

export function rawToTrack(r: RawTrack): Track {
  return {
    path: r.path, format: r.format as AudioFormat,
    title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '',
    albumArtist: r.album_artist ?? '', genre: r.genre ?? '', year: r.year ?? 0,
    trackNumber: r.track_number ?? 0, discNumber: r.disc_number ?? 0,
    duration: r.duration ?? 0, coverArt: r.cover_art,
    sampleRate: r.sample_rate ?? 0, bitrate: r.bitrate ?? 0, fileSize: r.file_size ?? 0,
    replayGainTrack: r.replay_gain_track, replayGainAlbum: r.replay_gain_album,
    lyrics: r.lyrics, comment: r.comment, composer: r.composer,
    fileModified: r.file_modified,
  }
}

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
