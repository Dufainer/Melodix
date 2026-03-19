import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle, Music2, ChevronRight, Play, BarChart2 } from 'lucide-react'
import { useLibraryStore } from '../store'
import { Track } from '../types'
import DailyMixModal from '../components/DailyMixModal'
import LazyCover from '../components/LazyCover'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(): number {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getDayIndex(ts: number): number {
  const d = new Date(ts).getDay()
  return d === 0 ? 6 : d - 1
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtBig(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m} m`
  return `${h} h ${m} m`
}

const FLOAT_STYLES: React.CSSProperties[] = [
  { top: '8%',  left: '-2%',  width: 130, height: 130, transform: 'rotate(-10deg)', borderRadius: 18 },
  { top: '50%', left: '5%',   width: 100, height: 100, transform: 'rotate(6deg)',   borderRadius: 14 },
  { top: '-5%', left: '30%',  width: 95,  height: 95,  transform: 'rotate(14deg)',  borderRadius: 14 },
  { top: '48%', left: '48%',  width: 115, height: 115, transform: 'rotate(-6deg)',  borderRadius: 16 },
  { top: '2%',  left: '65%',  width: 88,  height: 88,  transform: 'rotate(9deg)',   borderRadius: 14 },
  { top: '52%', left: '78%',  width: 100, height: 100, transform: 'rotate(-13deg)', borderRadius: 16 },
]

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
        className="absolute object-cover opacity-50 pointer-events-none select-none shadow-2xl"
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
  const { tracks, recentlyPlayed, playTrack, likedPaths, playHistory } = useLibraryStore()
  const [dailyMixOpen, setDailyMixOpen] = useState(false)
  const navigate = useNavigate()

  const weekEvents = useMemo(() => {
    const start = getWeekStart()
    return playHistory.filter(e => e.timestamp >= start)
  }, [playHistory])

  const weekSecs = useMemo(() => weekEvents.reduce((s, e) => s + e.duration, 0), [weekEvents])
  const weekPlays = weekEvents.length
  const weekDays = Math.max(1, Math.ceil((Date.now() - getWeekStart()) / 86400000))
  const avgPerDaySecs = weekSecs / weekDays

  const weekByDay = useMemo(() => {
    const arr = Array(7).fill(0)
    weekEvents.forEach(e => { arr[getDayIndex(e.timestamp)] += e.duration })
    return arr
  }, [weekEvents])
  const maxWeekDay = Math.max(...weekByDay, 1)

  const weekTopTrack = useMemo(() => {
    const map = new Map<string, { plays: number; secs: number }>()
    weekEvents.forEach(e => {
      const ex = map.get(e.path) ?? { plays: 0, secs: 0 }
      map.set(e.path, { plays: ex.plays + 1, secs: ex.secs + e.duration })
    })
    const top = [...map.entries()].sort((a, b) => b[1].plays - a[1].plays)[0]
    if (!top) return null
    const track = tracks.find(t => t.path === top[0])
    return track ? { track, plays: top[1].plays } : null
  }, [weekEvents, tracks])

  const recentTracks = useMemo(() =>
    recentlyPlayed.map(p => tracks.find(t => t.path === p)).filter(Boolean) as Track[],
    [recentlyPlayed, tracks]
  )

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

  const dailyMix = useMemo(() => {
    if (tracks.length === 0) return []
    const seed = getDailySeed()
    const topArtists = artistStats.slice(0, 4).map(a => a.artist)
    if (topArtists.length === 0) return seededShuffle(tracks, seed).slice(0, 25)
    const byArtist = topArtists.map(artist => {
      const artistTracks = tracks.filter(t => (t.artist || 'Unknown') === artist)
      const played = artistTracks
        .filter(t => trackPlayCount.has(t.path))
        .sort((a, b) => (trackPlayCount.get(b.path) ?? 0) - (trackPlayCount.get(a.path) ?? 0))
      const unplayed = seededShuffle(artistTracks.filter(t => !trackPlayCount.has(t.path)), seed)
      return [...played, ...unplayed].slice(0, 8)
    })
    const result: Track[] = []
    const maxLen = Math.max(...byArtist.map(a => a.length))
    for (let i = 0; i < maxLen; i++) {
      byArtist.forEach(arr => { if (arr[i]) result.push(arr[i]) })
    }
    return result.slice(0, 30)
  }, [tracks, artistStats, trackPlayCount])

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

        {/* ── Your Mix hero ─────────────────────────────────────────── */}
        <div className="relative shrink-0 mx-4 mt-4 rounded-3xl overflow-hidden" style={{ height: 210 }}>
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-indigo-950/80 to-[#080c12]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Floating covers */}
          {heroCoverTracks.map((track, i) => (
            <FloatingCover key={i} track={track} style={FLOAT_STYLES[i]} />
          ))}

          {/* Left vignette for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between px-6 py-5 z-10">
            <div>
              <p className="text-[10px] font-bold text-violet-300/80 tracking-[0.18em] uppercase mb-1">
                Today's Mix for you
              </p>
              <h1 className="text-3xl font-bold text-white leading-tight">Your Mix</h1>
              {dailyMix.length > 0 && (
                <p className="text-xs text-zinc-400 mt-1">{dailyMix.length} songs</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => dailyMix.length > 0 && playTrack(dailyMix[0], dailyMix)}
                disabled={dailyMix.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-bold transition-all hover:bg-zinc-200 disabled:opacity-30 shadow-lg"
              >
                <Play className="w-4 h-4 ml-0.5" />
                Play
              </button>
              <button
                onClick={handleYourMixShuffle}
                disabled={dailyMix.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-semibold transition-all disabled:opacity-30 backdrop-blur-sm"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* ── Recently Played ───────────────────────────────────────── */}
        {recentTracks.length > 0 && (
          <section className="mt-7 shrink-0">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="text-sm font-bold text-zinc-100">Recently Played</h2>
              <span className="text-[11px] text-zinc-600">{recentTracks.length} tracks</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto px-5 pb-3 scrollbar-hide">
              {recentTracks.slice(0, 15).map((track) => (
                <button
                  key={track.path}
                  onClick={() => playTrack(track, recentTracks)}
                  className="shrink-0 text-left group"
                  style={{ width: 130 }}
                >
                  <div
                    className="relative rounded-2xl overflow-hidden mb-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
                    style={{ width: 130, height: 130 }}
                  >
                    <LazyCover path={track.path} coverArt={track.coverArt} iconSize={32} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl scale-0 group-hover:scale-100 transition-transform duration-200">
                        <Play className="w-4 h-4 text-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-zinc-300 truncate group-hover:text-white transition-colors leading-tight">
                    {track.title || track.path.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-zinc-600 truncate mt-0.5">{track.artist || 'Unknown Artist'}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Listening Stats card ─────────────────────────────────── */}
        {weekPlays > 0 && (
          <section className="mt-5 px-4">
            <h2 className="text-sm font-bold text-zinc-100 mb-3">Listening Stats</h2>
            <button
              onClick={() => navigate('/stats')}
              className="w-full rounded-2xl bg-gradient-to-br from-blue-950/60 to-indigo-950/40 border border-blue-800/20 overflow-hidden text-left hover:border-blue-700/40 transition-all"
            >
              {/* Top row */}
              <div className="flex items-start justify-between px-4 pt-4 pb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest">This Week</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{fmtBig(weekSecs)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 mt-1" />
              </div>

              {/* Sub-stats */}
              <div className="flex gap-4 px-4 pb-3">
                <div className="rounded-xl bg-white/4 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Plays</p>
                  <p className="text-sm font-bold text-zinc-200">{weekPlays}</p>
                </div>
                <div className="rounded-xl bg-white/4 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Avg / day</p>
                  <p className="text-sm font-bold text-zinc-200">{fmtTime(avgPerDaySecs)}</p>
                </div>
                {weekTopTrack && (
                  <div className="rounded-xl bg-white/4 px-3 py-2 flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 mb-0.5">Top track</p>
                    <p className="text-sm font-bold text-zinc-200 truncate">{weekTopTrack.track.title || 'Unknown'}</p>
                  </div>
                )}
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-1.5 px-4 pt-1 pb-4">
                {weekByDay.map((secs, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all ${secs > 0 ? 'bg-blue-500/60' : 'bg-white/5'}`}
                      style={{ height: `${maxWeekDay > 0 ? Math.max(Math.round((secs / maxWeekDay) * 32), secs > 0 ? 4 : 2) : 2}px` }}
                    />
                    <span className="text-[9px] text-zinc-600">{DAY_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </button>
          </section>
        )}

        {/* ── Daily Mix card ────────────────────────────────────────── */}
        {dailyMix.length > 0 && (
          <section className="mt-5 px-4 mb-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-3">Daily Mix</h2>
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/6 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-300">Based on your history</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{dailyMix.length} tracks · refreshes daily</p>
                </div>
                {/* Stacked covers */}
                <div className="flex items-center">
                  {dailyMix.filter(t => t.coverArt).slice(0, 3).map((track, i) => (
                    <div
                      key={track.path}
                      className="w-8 h-8 rounded-lg overflow-hidden border-2 border-zinc-950 bg-white/5 shrink-0"
                      style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}
                    >
                      <img src={`data:image/jpeg;base64,${track.coverArt}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Track list */}
              <div className="px-3 pb-2">
                {dailyMix.slice(0, 4).map((track, i) => (
                  <div
                    key={track.path}
                    onClick={() => playTrack(track, dailyMix.slice(i))}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                      <LazyCover path={track.path} coverArt={track.coverArt} iconSize={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate font-medium">{track.title || track.path.split('/').pop()}</p>
                      <p className="text-[11px] text-zinc-600 truncate">{track.artist || 'Unknown Artist'}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <button
                  onClick={() => playTrack(dailyMix[0], dailyMix)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-white text-xs font-bold transition-all"
                >
                  <Play className="w-3 h-3 ml-0.5" />
                  Play all
                </button>
                <button
                  onClick={() => setDailyMixOpen(true)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  See all {dailyMix.length} songs
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
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
