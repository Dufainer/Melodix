import * as iTunes from './itunes'
import * as Lyrics from './lyrics'
import { FetchStep, FetchResult } from '../types'

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const buffer = await resp.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const chunkSize = 8192
    const chunks: string[] = []
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize))))
    }
    return btoa(chunks.join(''))
  } catch {
    return null
  }
}

function makeSteps(): FetchStep[] {
  return [
    { id: 'itunes',       label: 'iTunes — searching metadata',          status: 'pending' },
    { id: 'itunes-cover', label: 'iTunes — downloading cover',           status: 'pending' },
    { id: 'lyrics',       label: 'lrclib.net — fetching lyrics',         status: 'pending' },
  ]
}

export async function autoFetchMetadata(
  query: { title: string; artist: string; album: string },
  onUpdate: (steps: FetchStep[], partial: FetchResult) => void
): Promise<FetchResult> {
  const steps = makeSteps()
  const result: FetchResult = {}

  function update(id: string, status: FetchStep['status'], detail?: string) {
    const step = steps.find((s) => s.id === id)
    if (step) {
      step.status = status
      step.detail = detail
    }
    onUpdate([...steps], { ...result })
  }

  onUpdate([...steps], {})

  // ── Step 1: iTunes metadata ───────────────────────────────────────────────
  update('itunes', 'running')
  let itunesArtworkUrl: string | undefined
  try {
    const it = await iTunes.search(query.title, query.artist)
    if (it) {
      result.title       = it.title
      result.artist      = it.artist
      result.album       = it.album
      if (it.albumArtist) result.albumArtist = it.albumArtist
      if (it.composer)    result.composer    = it.composer
      if (it.genre)       result.genre       = it.genre
      if (it.year > 0)    result.year        = it.year
      itunesArtworkUrl = it.artworkUrl
      const info = [it.genre, it.year > 0 ? String(it.year) : null].filter(Boolean).join(' · ')
      update('itunes', 'success', info || 'Found')
    } else {
      update('itunes', 'skipped', 'No results found')
    }
  } catch (err) {
    update('itunes', 'error', String(err))
  }

  // ── Step 2: iTunes cover ─────────────────────────────────────────────────
  if (itunesArtworkUrl) {
    update('itunes-cover', 'running')
    try {
      const cover = await urlToBase64(itunesArtworkUrl)
      if (cover) {
        result.coverArt = cover
        update('itunes-cover', 'success', 'Cover downloaded')
      } else {
        update('itunes-cover', 'skipped', 'Download failed')
      }
    } catch (err) {
      update('itunes-cover', 'error', String(err))
    }
  } else {
    update('itunes-cover', 'skipped', 'No artwork URL available')
  }

  // ── Step 3: Lyrics ───────────────────────────────────────────────────────
  update('lyrics', 'running')
  try {
    const lyrics = await Lyrics.fetchLyrics(
      result.artist ?? query.artist,
      result.title  ?? query.title,
      result.album  ?? (query.album || undefined)
    )
    if (lyrics) {
      result.lyrics = lyrics
      const lines = lyrics.split('\n').filter(Boolean).length
      update('lyrics', 'success', `${lines} lines found`)
    } else {
      update('lyrics', 'skipped', 'No lyrics found')
    }
  } catch (err) {
    update('lyrics', 'error', String(err))
  }

  return result
}
