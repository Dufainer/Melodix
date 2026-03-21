export interface LrcLine {
  time: number  // seconds
  text: string
}

// Matches [mm:ss.xx], [m:ss.x], [mm:ss:xx] etc.
const LRC_REGEX = /\[(\d{1,2}):(\d{2})[.:](\d{1,3})\](.*)/

export function parseLrc(raw: string): LrcLine[] | null {
  const lines: LrcLine[] = []
  for (const line of raw.split('\n')) {
    const m = line.match(LRC_REGEX)
    if (!m) continue
    const ms = parseInt(m[3].padEnd(3, '0').slice(0, 3))
    const time = parseInt(m[1]) * 60 + parseInt(m[2]) + ms / 1000
    const text = m[4].trim()
    if (text) lines.push({ time, text })
  }
  return lines.length > 0 ? lines.sort((a, b) => a.time - b.time) : null
}

export function isLrc(raw: string): boolean {
  return LRC_REGEX.test(raw)
}

export interface LrcLibResult {
  syncedLyrics: string | null
  plainLyrics: string | null
}

export async function fetchLrcLib(
  artist: string,
  title: string,
  album: string,
  duration: number,
): Promise<LrcLibResult | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
    album_name: album,
    duration: String(Math.round(duration)),
  })
  const res = await fetch(`https://lrclib.net/api/get?${params}`, {
    headers: { 'Lrclib-Client': 'Melodix/0.2.0' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return {
    syncedLyrics: data.syncedLyrics ?? null,
    plainLyrics: data.plainLyrics ?? null,
  }
}
