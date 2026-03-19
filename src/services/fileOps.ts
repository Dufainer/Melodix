import { Track } from '../types'

function sanitize(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, '_').trim()
}

function capitalizeFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Extract the primary artist from a multi-artist string.
 *  "TV Girl, Jordan" → "TV Girl"
 *  "Nujabes; Cise Starr" → "Nujabes"
 *  "Frank Sinatra/ Tony Bennett" → "Frank Sinatra"
 *  "Jordana_ TV Girl" → "Jordana"
 */
export function primaryArtist(artist: string): string {
  if (!artist?.trim()) return 'Unknown Artist'
  const lower = artist.toLowerCase()
  const separators = [
    '; ', ';',
    ', ', ',',
    ' feat. ', ' feat ', ' ft. ', ' ft ',
    ' & ',
    ' x ',
    ' with ',
    ' / ', '/ ', ' /', '/',
    ' _ ', '_ ', ' _',
  ]
  let cut = artist.length
  for (const sep of separators) {
    const idx = lower.indexOf(sep)
    if (idx !== -1 && idx < cut) cut = idx
  }
  return capitalizeFirst(artist.slice(0, cut).trim())
}

/** Apply a pattern using the full artist (for file renaming). */
export function applyPattern(pattern: string, track: Partial<Track>): string {
  const trackNum = (track.trackNumber ?? 0) > 0
    ? String(track.trackNumber).padStart(2, '0')
    : ''
  const disc   = (track.discNumber ?? 0) > 0 ? String(track.discNumber) : ''
  const year   = (track.year ?? 0) > 0 ? String(track.year) : ''
  const artist = sanitize(capitalizeFirst(track.artist?.trim() || 'Unknown Artist'))
  const album  = sanitize(capitalizeFirst(track.album?.trim()  || 'Unknown Album'))
  const title  = sanitize(capitalizeFirst(track.title?.trim()  || 'Untitled'))
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

/** Apply a folder pattern using the primary artist only. */
export function applyFolderPattern(pattern: string, track: Partial<Track>): string {
  const trackNum = (track.trackNumber ?? 0) > 0
    ? String(track.trackNumber).padStart(2, '0')
    : ''
  const disc   = (track.discNumber ?? 0) > 0 ? String(track.discNumber) : ''
  const year   = (track.year ?? 0) > 0 ? String(track.year) : ''
  const artist = sanitize(primaryArtist(track.artist ?? ''))
  const album  = sanitize(capitalizeFirst(track.album?.trim()  || 'Unknown Album'))
  const title  = sanitize(capitalizeFirst(track.title?.trim()  || 'Untitled'))
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
    .map((part) => applyFolderPattern(part, track))
    .filter(Boolean)
    .join('/')
  const file = applyPattern(filePattern, track) + '.' + ext
  return folder ? `${folder}/${file}` : file
}
