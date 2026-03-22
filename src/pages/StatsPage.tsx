import { useMemo, useState } from 'react'
import { useLibraryStore, PlayEvent } from '../store'
import LazyCover from '../components/LazyCover'
import { useThemeLabels } from '../hooks/useTheme'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'
type TopTab = 'song' | 'album' | 'artist'

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getPeriodStart(period: Period): number {
  const now = new Date()
  switch (period) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime()
    }
    case 'week': {
      const d = new Date(now)
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    case 'year':  return new Date(now.getFullYear(), 0, 1).getTime()
    case 'all':   return 0
  }
}

function getDayIndex(ts: number): number {
  const d = new Date(ts).getDay()
  return d === 0 ? 6 : d - 1
}

type Bucket = { label: string; secs: number }

function getChartBuckets(events: PlayEvent[], period: Period): Bucket[] {
  const now = new Date()
  if (period === 'today') {
    const arr = Array(24).fill(0)
    events.forEach(e => { arr[new Date(e.timestamp).getHours()] += e.duration })
    return arr.map((secs, h) => ({ label: h % 6 === 0 ? `${h}h` : '', secs }))
  }
  if (period === 'week') {
    const arr = Array(7).fill(0)
    events.forEach(e => { arr[getDayIndex(e.timestamp)] += e.duration })
    return arr.map((secs, i) => ({ label: DAY_LABELS[i], secs }))
  }
  if (period === 'month') {
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const numWeeks = Math.ceil(daysInMonth / 7)
    const arr = Array(numWeeks).fill(0)
    events.forEach(e => {
      const d = new Date(e.timestamp)
      if (d.getFullYear() === year && d.getMonth() === month)
        arr[Math.min(Math.floor((d.getDate() - 1) / 7), numWeeks - 1)] += e.duration
    })
    return arr.map((secs, i) => ({ label: `W${i + 1}`, secs }))
  }
  if (period === 'year') {
    const year = now.getFullYear()
    const arr = Array(12).fill(0)
    events.forEach(e => {
      const d = new Date(e.timestamp)
      if (d.getFullYear() === year) arr[d.getMonth()] += e.duration
    })
    return arr.map((secs, i) => ({ label: MONTH_LABELS[i], secs }))
  }
  // all time — group by year
  const map = new Map<number, number>()
  events.forEach(e => {
    const y = new Date(e.timestamp).getFullYear()
    map.set(y, (map.get(y) ?? 0) + e.duration)
  })
  if (map.size === 0) return []
  const years = [...map.keys()].sort()
  return years.map(y => ({ label: String(y), secs: map.get(y)! }))
}

const CHART_META: Record<Period, { title: string; subtitle: string }> = {
  today: { title: 'Hourly breakdown',  subtitle: "Today's activity by hour" },
  week:  { title: 'Weekly rhythm',     subtitle: 'Grouped by day of week' },
  month: { title: 'Monthly rhythm',    subtitle: 'Grouped by week' },
  year:  { title: 'Yearly rhythm',     subtitle: 'Grouped by month' },
  all:   { title: 'All-time history',  subtitle: 'Grouped by year' },
}

function computeSessions(events: PlayEvent[]): number[][] {
  if (events.length === 0) return []
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const sessions: PlayEvent[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp > 30 * 60 * 1000)
      sessions.push([])
    sessions[sessions.length - 1].push(sorted[i])
  }
  return sessions.map(s => s.map(e => e.duration))
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  if (secs < 60) return `${Math.round(secs)}s`
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

export default function StatsPage() {
  const { playHistory, tracks } = useLibraryStore()
  const [period, setPeriod] = useState<Period>('week')
  const [topTab, setTopTab] = useState<TopTab>('song')
  const L = useThemeLabels()

  const filtered = useMemo(() => {
    const start = getPeriodStart(period)
    return playHistory.filter(e => e.timestamp >= start)
  }, [playHistory, period])

  const totalSecs = useMemo(() => filtered.reduce((s, e) => s + e.duration, 0), [filtered])
  const totalPlays = filtered.length

  const daysInPeriod = useMemo(() => {
    if (period === 'all') {
      if (filtered.length === 0) return 1
      const min = Math.min(...filtered.map(e => e.timestamp))
      return Math.max(1, Math.ceil((Date.now() - min) / 86400000))
    }
    const start = getPeriodStart(period)
    return Math.max(1, Math.ceil((Date.now() - start) / 86400000))
  }, [period, filtered])

  const avgPerDaySecs = totalSecs / daysInPeriod

  const chartBuckets = useMemo(() => getChartBuckets(filtered, period), [filtered, period])
  const maxBucket = Math.max(...chartBuckets.map(b => b.secs), 1)
  const peakBucketIdx = chartBuckets.reduce((best, b, i) => b.secs > chartBuckets[best].secs ? i : best, 0)

  const topTracks = useMemo(() => {
    const map = new Map<string, { plays: number; secs: number }>()
    filtered.forEach(e => {
      const ex = map.get(e.path) ?? { plays: 0, secs: 0 }
      map.set(e.path, { plays: ex.plays + 1, secs: ex.secs + e.duration })
    })
    return [...map.entries()]
      .sort((a, b) => b[1].plays - a[1].plays || b[1].secs - a[1].secs)
      .map(([path, s]) => ({ path, ...s, track: tracks.find(t => t.path === path) }))
      .filter(x => x.track)
      .slice(0, 10)
  }, [filtered, tracks])

  const topArtists = useMemo(() => {
    const map = new Map<string, { plays: number; secs: number; paths: Set<string> }>()
    filtered.forEach(e => {
      const t = tracks.find(t => t.path === e.path)
      const artist = t?.artist || 'Unknown'
      const ex = map.get(artist) ?? { plays: 0, secs: 0, paths: new Set() }
      ex.plays++; ex.secs += e.duration; ex.paths.add(e.path)
      map.set(artist, ex)
    })
    return [...map.entries()]
      .sort((a, b) => b[1].plays - a[1].plays)
      .map(([artist, s], i) => ({ rank: i + 1, artist, plays: s.plays, secs: s.secs, uniqueTracks: s.paths.size }))
      .slice(0, 5)
  }, [filtered, tracks])

  const topAlbums = useMemo(() => {
    const map = new Map<string, { plays: number; secs: number; paths: Set<string>; coverArt?: string }>()
    filtered.forEach(e => {
      const t = tracks.find(t => t.path === e.path)
      const album = t?.album || 'Unknown'
      const ex = map.get(album) ?? { plays: 0, secs: 0, paths: new Set() }
      ex.plays++; ex.secs += e.duration; ex.paths.add(e.path)
      if (t?.coverArt) ex.coverArt = t.coverArt
      map.set(album, ex)
    })
    return [...map.entries()]
      .sort((a, b) => b[1].plays - a[1].plays)
      .map(([album, s], i) => ({ rank: i + 1, album, plays: s.plays, secs: s.secs, uniqueTracks: s.paths.size, coverArt: s.coverArt, firstPath: [...s.paths][0] }))
      .slice(0, 5)
  }, [filtered, tracks])

  const sessionGroups = useMemo(() => computeSessions(filtered), [filtered])
  const sessionDurations = sessionGroups.map(s => s.reduce((a, b) => a + b, 0))
  const totalSessions = sessionGroups.length
  const avgSessionSecs = totalSessions > 0 ? totalSecs / totalSessions : 0
  const longestSessionSecs = sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0
  const sessionsPerDay = daysInPeriod > 0 ? totalSessions / daysInPeriod : 0

  const mostActiveDay = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(e => {
      const name = new Date(e.timestamp).toLocaleDateString('en', { weekday: 'long' })
      map.set(name, (map.get(name) ?? 0) + e.duration)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  }, [filtered])

  const uniqueTracks = new Set(filtered.map(e => e.path)).size
  const avgPlaysPerTrack = uniqueTracks > 0 ? totalPlays / uniqueTracks : 0
  const top1Secs = topTracks[0]?.secs ?? 0
  const top3Secs = topTracks.slice(0, 3).reduce((s, t) => s + t.secs, 0)
  const top1Pct = totalSecs > 0 ? Math.round((top1Secs / totalSecs) * 100) : 0
  const top3Pct = totalSecs > 0 ? Math.round((top3Secs / totalSecs) * 100) : 0
  const maxTopSecs = topTracks[0]?.secs ?? 1
  const maxArtistPlays = topArtists[0]?.plays ?? 1
  const maxAlbumPlays = topAlbums[0]?.plays ?? 1

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
        <h1 className="text-2xl font-bold text-white">{L.statsTitle}</h1>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 px-5 py-3 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-hide">
        {PERIOD_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              period === key
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-accent-faint)', border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-accent-light)' }}>{L.statsListening}</p>
            <p className="text-2xl font-bold text-white">{fmtBig(totalSecs)}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-accent-light)', opacity: 0.8 }}>{L.statsPlays}</p>
            <p className="text-2xl font-bold text-white">{totalPlays}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
            <p className="text-xs text-zinc-400 font-medium mb-1">{L.statsAvgPerDay}</p>
            <p className="text-2xl font-bold text-white">{fmtTime(avgPerDaySecs)}</p>
          </div>
        </div>

        {/* Dynamic chart */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-accent-faint)', border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)' }}>
          <p className="text-sm font-semibold text-white mb-0.5">{CHART_META[period].title}</p>
          <p className="text-xs text-zinc-500 mb-4">{CHART_META[period].subtitle}</p>
          <div className="flex items-end gap-1 mb-2">
            {chartBuckets.map(({ label, secs }, i) => {
              const barPx = Math.max(Math.round((secs / maxBucket) * 80), secs > 0 ? 6 : 3)
              const isPeak = i === peakBucketIdx && secs > 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  {secs > 0 && (
                    <span className="text-[9px] text-zinc-400 tabular-nums leading-none">{fmtTime(secs)}</span>
                  )}
                  <div
                    className={`w-full transition-all ${isPeak ? 'stats-chart-bar-peak' : secs > 0 ? 'stats-chart-bar' : 'bg-white/5'}`}
                    style={{ height: `${barPx}px` }}
                  />
                  {label && <span className="text-[9px] text-zinc-500 truncate w-full text-center">{label}</span>}
                </div>
              )
            })}
          </div>
          {chartBuckets[peakBucketIdx]?.secs > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{ background: 'var(--color-accent-faint)', color: 'var(--color-accent)' }}>↑</div>
              <div>
                <p className="text-xs font-medium text-zinc-300">{L.statsPeakSegment}</p>
                <p className="text-xs text-zinc-500">{chartBuckets[peakBucketIdx].label} · {fmtTime(chartBuckets[peakBucketIdx].secs)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Top categories */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">{L.statsTopCategories}</h2>
          <p className="text-xs text-zinc-600 mb-3">{L.statsTopCategoriesDesc}</p>
          <div className="flex gap-2 mb-3">
            {(['song', 'album', 'artist'] as TopTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setTopTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                  topTab === tab
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {tab === 'song' ? L.statsTabSong : tab === 'album' ? L.statsTabAlbum : L.statsTabArtist}
              </button>
            ))}
          </div>

          {topTab === 'song' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-accent-faint)', border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)' }}>
              <p className="text-sm font-semibold text-white px-4 pt-4 pb-3">{L.statsTopSongs}</p>
              {topTracks.length === 0
                ? <p className="text-xs text-zinc-600 px-4 pb-4">{L.statsNoData}</p>
                : topTracks.map((item, i) => (
                  <div key={item.path} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-accent/20 text-accent' : 'bg-white/5 text-zinc-500'
                      }`}>{i + 1}</div>
                      <LazyCover path={item.track!.path} coverArt={item.track!.coverArt} className="w-9 h-9 rounded-lg shrink-0" iconSize={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{item.track?.title || item.path.split('/').pop()}</p>
                        <p className="text-xs text-zinc-500">{item.plays} plays · {item.track?.artist || 'Unknown'}</p>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">{fmtTime(item.secs)}</span>
                    </div>
                    <div className="mt-2 ml-10 h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full stats-progress-bar rounded-full" style={{ width: `${(item.secs / maxTopSecs) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}

          {topTab === 'artist' && (
            <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
              <p className="text-sm font-semibold text-white px-4 pt-4 pb-3">{L.statsTopArtists}</p>
              {topArtists.length === 0
                ? <p className="text-xs text-zinc-600 px-4 pb-4">{L.statsNoData}</p>
                : topArtists.map((item, i) => (
                  <div key={item.artist} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: 'var(--color-accent-faint)', color: 'var(--color-accent-light)' }}>
                        {item.artist.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{item.rank}. {item.artist}</p>
                        <p className="text-xs text-zinc-500">{item.plays} plays · {item.uniqueTracks} tracks</p>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">{fmtTime(item.secs)}</span>
                    </div>
                    <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full stats-progress-bar rounded-full" style={{ width: `${(item.plays / maxArtistPlays) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}

          {topTab === 'album' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 16%, transparent)' }}>
              <p className="text-sm font-semibold text-white px-4 pt-4 pb-3">{L.statsTopAlbums}</p>
              {topAlbums.length === 0
                ? <p className="text-xs text-zinc-600 px-4 pb-4">{L.statsNoData}</p>
                : topAlbums.map((item, i) => (
                  <div key={item.album} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <LazyCover path={item.firstPath!} coverArt={item.coverArt} className="w-10 h-10 rounded-lg shrink-0" iconSize={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{item.rank}. {item.album}</p>
                        <p className="text-xs text-zinc-500">{item.plays} plays · {item.uniqueTracks} tracks</p>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">{fmtTime(item.secs)}</span>
                    </div>
                    <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full stats-progress-bar rounded-full" style={{ width: `${(item.plays / maxAlbumPlays) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Listening habits */}
        {totalSessions > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Listening habits</h2>
            <div className="space-y-2">
              {[
                { label: 'Total sessions', value: String(totalSessions), icon: '↺' },
                { label: 'Avg session', value: fmtTime(avgSessionSecs), icon: '◎' },
                { label: 'Longest session', value: fmtTime(longestSessionSecs), icon: '⚡' },
                { label: 'Sessions/day', value: sessionsPerDay.toFixed(1), icon: '∿' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm text-zinc-400 shrink-0">{icon}</div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-sm font-semibold text-zinc-200">{value}</p>
                  </div>
                </div>
              ))}
              {mostActiveDay && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm text-zinc-400 shrink-0">📅</div>
                  <div>
                    <p className="text-xs text-zinc-500">Most active day</p>
                    <p className="text-sm font-semibold text-zinc-200">{mostActiveDay[0]}</p>
                    <p className="text-xs text-zinc-600">{fmtTime(mostActiveDay[1])}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Track concentration */}
        {uniqueTracks > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Track concentration</h2>
            <div className="rounded-2xl bg-white/3 border border-white/5 p-4">
              <p className="text-xs text-zinc-500 mb-4">How your listening time is distributed across your top tracks.</p>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        var(--color-accent) 0% ${top1Pct}%,
                        var(--color-accent-light) ${top1Pct}% ${top3Pct}%,
                        rgba(255,255,255,0.08) ${top3Pct}% 100%
                      )`
                    }}
                  />
                  <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{top3Pct}%</p>
                      <p className="text-[9px] text-zinc-500">Top 3 share</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <p className="text-xs text-zinc-500">Avg plays/track</p>
                    <p className="text-base font-bold text-accent">{avgPlaysPerTrack.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-xs text-zinc-500">Unique tracks</p>
                    <p className="text-base font-bold text-zinc-200">{uniqueTracks}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Top 1', pct: top1Pct, secs: top1Secs, dotStyle: { background: 'var(--color-accent)' } as React.CSSProperties },
                  { label: 'Top 2–3', pct: top3Pct - top1Pct, secs: top3Secs - top1Secs, dotStyle: { background: 'var(--color-accent-light)' } as React.CSSProperties },
                  { label: 'Others', pct: 100 - top3Pct, secs: totalSecs - top3Secs, dotStyle: { background: 'rgba(255,255,255,0.25)' } as React.CSSProperties },
                ].map(({ label, pct, secs, dotStyle }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={dotStyle} />
                    <span className="text-xs text-zinc-400 w-12">{label}</span>
                    <span className="text-xs text-zinc-500 w-8 tabular-nums">{pct}%</span>
                    <span className="text-xs text-zinc-600">{fmtTime(secs)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {totalPlays === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
            <p className="text-sm">{L.statsNoData}</p>
            <p className="text-xs text-zinc-700">Play some music to see your stats</p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
