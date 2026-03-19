import { Track } from '../types'

function sanitize(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, '_').trim()
}

export function applyPattern(pattern: string, track: Partial<Track>): string {
  const trackNum = (track.trackNumber ?? 0) > 0
    ? String(track.trackNumber).padStart(2, '0')
    : ''
  const disc = (track.discNumber ?? 0) > 0 ? String(track.discNumber) : ''
  const year = (track.year ?? 0) > 0 ? String(track.year) : ''
  const artist = sanitize(track.artist?.trim() || 'Unknown Artist')
  const album  = sanitize(track.album?.trim()  || 'Unknown Album')
  const title  = sanitize(track.title?.trim()  || 'Untitled')
  const genre  = sanitize(track.genre ?? '')

  return pattern
    .replace('{title}',  title)
    .replace('{artist}', artist)
    .replace('{album}',  album)
    .replace('{track}',  trackNum)
    .replace('{disc}',   disc)
    .replace('{year}',   year)
    .replace('{genre}',  genre)
}

export function buildPreviewPath(
  folderPattern: string,
  filePattern: string,
  track: Partial<Track>,
  ext = 'flac'
): string {
  const folder = folderPattern
    .split('/')
    .map((part) => applyPattern(part, track))
    .filter(Boolean)
    .join('/')
  const file = applyPattern(filePattern, track) + '.' + ext
  return folder ? `${folder}/${file}` : file
}
