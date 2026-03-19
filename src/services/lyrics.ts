export async function fetchLyrics(
  artist: string,
  title: string,
  album?: string
): Promise<string | null> {
  try {
    const url = new URL('https://lrclib.net/api/get')
    url.searchParams.set('artist_name', artist)
    url.searchParams.set('track_name', title)
    if (album) url.searchParams.set('album_name', album)

    const resp = await fetch(url.toString())
    if (!resp.ok) return null
    const data = await resp.json() as { plainLyrics?: string; syncedLyrics?: string }
    return data.plainLyrics ?? data.syncedLyrics ?? null
  } catch {
    return null
  }
}
