import { useMemo, useState } from 'react'
import { Shuffle, Music2, ChevronRight } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'
import DailyMixModal from '../components/DailyMixModal'

const FLOAT_STYLES: React.CSSProperties[] = [
  { top: '5%',  left: '-1%',  width: 140, height: 140, transform: 'rotate(-8deg)', borderRadius: 16 },
  { top: '48%', left: '7%',   width: 110, height: 110, transform: 'rotate(5deg)',  borderRadius: 16 },
  { top: '-8%', left: '33%',  width: 100, height: 100, transform: 'rotate(12deg)', borderRadius: 16 },
  { top: '52%', left: '50%',  width: 120, height: 120, transform: 'rotate(-4deg)', borderRadius: 16 },
  { top: '4%',  left: '66%',  width: 90,  height: 90,  transform: 'rotate(8deg)',  borderRadius: 16 },
  { top: '55%', left: '80%',  width: 105, height: 105, transform: 'rotate(-11deg)', borderRadius: 16 },
]

// Deterministic seed so daily mix is stable within the same day
function getDailySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function FloatingCover({ track, style }: { track: Track | null; style: React.CSSProperties }) {
  if (track?.coverArt) {
    return (
      <img
        src={`data:image/jpeg;base64,${track.coverArt}`}
        alt=""
        aria-hidden
        className="absolute object-cover opacity-60 pointer-events-none select-none"
        style={style}
      />
    )
  }
  return (
    <div
      aria-hidden
      className="absolute bg-white/5 border border-white/8 flex items-center justify-center pointer-events-none select-none"
      style={style}
    >
      <Music2 className="text-zinc-700" style={{ width: '35%', height: '35%' }} />
    </div>
  )
}

export default function Home() {
  const { tracks, recentlyPlayed, playTrack, likedPaths } = useLibraryStore()
  const [dailyMixOpen, setDailyMixOpen] = useState(false)

  const recentTracks = useMemo(() =>
    recentlyPlayed.map(p => tracks.find(t => t.path === p)).filter(Boolean) as Track[],
    [recentlyPlayed, tracks]
  )

  // Statistics: play count per track and per artist
  const trackPlayCount = useMemo(() => {
    const map = new Map<string, number>()
    recentlyPlayed.forEach(path => map.set(path, (map.get(path) ?? 0) + 1))
    return map
  }, [recentlyPlayed])

  const artistStats = useMemo(() => {
    const map = new Map<string, number>()
    tracks.forEach(t => {
      const plays = trackPlayCount.get(t.path) ?? 0
      if (plays > 0) {
        const a = t.artist || 'Unknown'
        map.set(a, (map.get(a) ?? 0) + plays)
      }
    })
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([artist, plays]) => ({ artist, plays }))
  }, [tracks, trackPlayCount])

  // Daily Mix: stats-based, stable within the day
  const dailyMix = useMemo(() => {
    if (tracks.length === 0) return []

    const seed = getDailySeed()
    const topArtists = artistStats.slice(0, 4).map(a => a.artist)

    if (topArtists.length === 0) {
      return seededShuffle(tracks, seed).slice(0, 25)
    }

    // For each top artist, sort their tracks by personal play count (most played first)
    // then fill remaining slots with unplayed tracks from that artist
    const byArtist = topArtists.map(artist => {
      const artistTracks = tracks.filter(t => (t.artist || 'Unknown') === artist)
      const played = artistTracks
        .filter(t => trackPlayCount.has(t.path))
        .sort((a, b) => (trackPlayCount.get(b.path) ?? 0) - (trackPlayCount.get(a.path) ?? 0))
      const unplayed = seededShuffle(
        artistTracks.filter(t => !trackPlayCount.has(t.path)),
        seed
      )
      return [...played, ...unplayed].slice(0, 8)
    })

    const result: Track[] = []
    const maxLen = Math.max(...byArtist.map(a => a.length))
    for (let i = 0; i < maxLen; i++) {
      byArtist.forEach(arr => { if (arr[i]) result.push(arr[i]) })
    }
    return result.slice(0, 30)
  }, [tracks, artistStats, trackPlayCount])

  // Covers for floating hero art
  const heroCoverTracks = useMemo(() => {
    const pool = [
      ...recentTracks,
      ...tracks.filter(t => likedPaths.includes(t.path)),
      ...tracks,
    ]
    const seen = new Set<string>()
    const out: (Track | null)[] = []
    for (const t of pool) {
      if (out.length >= 6) break
      if (!seen.has(t.path)) { seen.add(t.path); out.push(t) }
    }
    while (out.length < 6) out.push(null)
    return out
  }, [recentTracks, tracks, likedPaths])

  function handleYourMixShuffle() {
    if (dailyMix.length === 0) return
    const shuffled = [...dailyMix].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-y-auto">

        {/* ── Your Mix ─────────────────────────────────────────────── */}
        <div className="relative shrink-0 mx-5 mt-5 rounded-2xl overflow-hidden" style={{ height: 220 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/25 to-[#080c12]" />

          {heroCoverTracks.map((track, i) => (
            <FloatingCover key={i} track={track} style={FLOAT_STYLES[i]} />
          ))}

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />

          <div className="relative h-full flex items-center justify-between px-7 z-10">
            <div>
              <p className="text-xs text-zinc-400 font-medium mb-1 tracking-wide uppercase">Today's Mix for you</p>
              <h1 className="text-4xl font-bold text-white leading-tight">Your Mix</h1>
            </div>
            <button
              onClick={handleYourMixShuffle}
              disabled={dailyMix.length === 0}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all disabled:opacity-30 backdrop-blur-sm"
            >
              <Shuffle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ── Recently Played ───────────────────────────────────────── */}
        {recentTracks.length > 0 && (
          <div className="mt-6 shrink-0">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="text-sm font-semibold text-zinc-200">Recently Played</h2>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {recentTracks.slice(0, 15).map((track) => (
                <button
                  key={track.path}
                  onClick={() => playTrack(track, recentTracks)}
                  className="shrink-0 w-28 text-left group"
                >
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-white/5 border border-white/8 mb-2 flex items-center justify-center group-hover:border-white/20 transition-all">
                    {track.coverArt
                      ? <img src={`data:image/jpeg;base64,${track.coverArt}`} alt="" className="w-full h-full object-cover" />
                      : <Music2 className="w-8 h-8 text-zinc-700" />
                    }
                  </div>
                  <p className="text-xs font-medium text-zinc-300 truncate group-hover:text-white transition-colors">
                    {track.title || track.path.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-zinc-600 truncate">{track.artist || 'Unknown Artist'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Daily Mix card ────────────────────────────────────────── */}
        {dailyMix.length > 0 && (
          <div className="mt-6 mx-5 mb-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Daily Mix</h2>
            <div className="rounded-2xl bg-white/3 border border-white/6 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Daily Mix</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Based on History</p>
                </div>
                <div className="flex items-center">
                  {dailyMix.filter(t => t.coverArt).slice(0, 3).map((track, i) => (
                    <div
                      key={track.path}
                      className="w-9 h-9 rounded-lg overflow-hidden border-2 border-[#080c12] bg-white/5"
                      style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }}
                    >
                      <img src={`data:image/jpeg;base64,${track.coverArt}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 pb-2">
                {dailyMix.slice(0, 4).map((track, i) => (
                  <div
                    key={track.path}
                    onClick={() => playTrack(track, dailyMix.slice(i))}
                    className="flex items-center gap-3 py-2 border-t border-white/5 cursor-pointer hover:bg-white/3 rounded-lg px-1 -mx-1 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{track.title || track.path.split('/').pop()}</p>
                      <p className="text-[11px] text-zinc-600 truncate">{track.artist || 'Unknown Artist'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <button
                  onClick={() => { playTrack(dailyMix[0], dailyMix) }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-white text-xs font-semibold transition-all"
                >
                  Play
                </button>
                <button
                  onClick={() => setDailyMixOpen(true)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Check all of Daily Mix
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-600 py-16">
            <Music2 className="w-12 h-12 opacity-20" />
            <p className="text-sm text-zinc-500">No music yet</p>
            <p className="text-xs text-zinc-700">Scan a folder from Settings to get started</p>
          </div>
        )}
      </div>

      <DailyMixModal
        open={dailyMixOpen}
        onClose={() => setDailyMixOpen(false)}
        dailyMix={dailyMix}
        artistStats={artistStats}
      />
    </>
  )
}
