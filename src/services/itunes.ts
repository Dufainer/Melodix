interface iTunesTrack {
  trackName: string
  artistName: string
  collectionName: string
  collectionArtistName?: string
  composerName?: string
  artworkUrl100: string
  primaryGenreName: string
  releaseDate: string
}

export interface iTunesResult {
  title: string
  artist: string
  album: string
  albumArtist?: string
  composer?: string
  genre: string
  year: number
  artworkUrl: string
}

export async function search(title: string, artist: string): Promise<iTunesResult | null> {
  try {
    const term = [artist, title].filter(Boolean).join(' ')
    const url = new URL('https://itunes.apple.com/search')
    url.searchParams.set('term', term)
    url.searchParams.set('media', 'music')
    url.searchParams.set('entity', 'song')
    url.searchParams.set('limit', '5')

    const resp = await fetch(url.toString())
    if (!resp.ok) return null
    const data = await resp.json() as { results: iTunesTrack[] }

    const results = data.results ?? []
    if (results.length === 0) return null

    const r = results[0]
    return {
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      albumArtist: r.collectionArtistName,
      composer: r.composerName,
      genre: r.primaryGenreName,
      year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : 0,
      artworkUrl: r.artworkUrl100.replace('100x100bb', '600x600bb'),
    }
  } catch {
    return null
  }
}
