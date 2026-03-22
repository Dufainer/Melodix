import { useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, SlidersHorizontal } from 'lucide-react'
import { useLibraryStore } from '../store'

const BANDS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K']
const TRACK_H = 160  // px — full drag range

const PRESETS: Record<string, number[]> = {
  flat:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass:       [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble:     [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
  rock:       [4, 3, 2, 0, -1, -1, 0, 2, 4, 4],
  pop:        [-1, 0, 2, 3, 2, 0, 0, -1, -1, -1],
  jazz:       [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  classical:  [4, 3, 2, 2, 0, 0, 0, 2, 3, 4],
  electronic: [4, 3, 0, -2, -2, 2, 0, 2, 4, 4],
  vocal:      [-1, -1, 0, 2, 4, 4, 2, 1, 0, -1],
}

const PRESET_LABELS: Record<string, string> = {
  flat: 'Flat', bass: 'Bass', treble: 'Treble', rock: 'Rock',
  pop: 'Pop', jazz: 'Jazz', classical: 'Classical', electronic: 'Electronic', vocal: 'Vocal',
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
function snap(v: number) { return Math.round(v * 2) / 2 }  // snap to 0.5 dB steps

// Custom vertical drag slider
function VerticalSlider({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)

  function yToDb(clientY: number): number {
    const rect = trackRef.current!.getBoundingClientRect()
    const ratio = clamp((clientY - rect.top) / rect.height, 0, 1)
    return snap(12 - ratio * 24)  // top = +12 dB, bottom = -12 dB
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(yToDb(e.clientY))
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons !== 1) return
    onChange(yToDb(e.clientY))
  }, [])

  // Double-click resets to 0
  const handleDblClick = useCallback(() => onChange(0), [])

  const pct = ((12 - value) / 24) * 100  // 0% = top (+12), 100% = bottom (-12)
  const centerPct = 50
  const fillTop    = value > 0 ? pct : centerPct
  const fillBottom = value < 0 ? 100 - pct : centerPct
  const fillHeight = fillBottom - fillTop

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDblClick}
      className="relative flex items-center justify-center cursor-ns-resize select-none"
      style={{ height: TRACK_H, width: '100%' }}
    >
      {/* Track background */}
      <div className="absolute left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-white/8" style={{ top: 0, height: TRACK_H }} />

      {/* Center 0 dB marker */}
      <div className="absolute left-0 right-0 h-px bg-white/15" style={{ top: '50%' }} />

      {/* Colored fill from center */}
      {fillHeight > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[3px] rounded-full"
          style={{
            top: `${fillTop}%`,
            height: `${fillHeight}%`,
            background: value > 0
              ? 'var(--color-accent)'
              : 'rgba(255,255,255,0.25)',
          }}
        />
      )}

      {/* Thumb */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-accent bg-bg shadow-lg transition-shadow hover:shadow-accent/30"
        style={{
          top: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: value !== 0 ? 14 : 10,
          height: value !== 0 ? 14 : 10,
          background: value !== 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
          borderColor: value !== 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)',
        }}
      />
    </div>
  )
}

// dB scale on the left
function DbScale() {
  const marks = [12, 6, 0, -6, -12]
  return (
    <div className="relative shrink-0" style={{ width: 28, height: TRACK_H }}>
      {marks.map((db) => {
        const top = ((12 - db) / 24) * TRACK_H
        return (
          <div
            key={db}
            className="absolute right-0 flex items-center"
            style={{ top, transform: 'translateY(-50%)' }}
          >
            <span className="text-[9px] text-zinc-700 font-mono tabular-nums">
              {db > 0 ? `+${db}` : db}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Main panel
export default function EqPanel() {
  const {
    eqPanelOpen, setEqPanelOpen,
    eqEnabled, setEqEnabled,
    eqBands, setEqBand,
    eqPreset, setEqPreset,
  } = useLibraryStore()

  useEffect(() => {
    invoke('player_set_eq', { bands: eqBands.map(Number), enabled: eqEnabled }).catch(() => {})
  }, [eqBands, eqEnabled])

  if (!eqPanelOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setEqPanelOpen(false)} />

      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50
                      w-[680px] bg-surface border border-white/10 rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-zinc-100">Equalizer</span>
            <span className="text-xs text-zinc-600">Double-click a band to reset</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEqEnabled(!eqEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                eqEnabled
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${eqEnabled ? 'bg-accent' : 'bg-zinc-600'}`} />
              {eqEnabled ? 'On' : 'Off'}
            </button>
            <button onClick={() => setEqPanelOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5 px-5 pt-3 pb-2 flex-wrap shrink-0">
          {Object.keys(PRESET_LABELS).map((name) => (
            <button
              key={name}
              onClick={() => setEqPreset(name, PRESETS[name])}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                eqPreset === name
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              {PRESET_LABELS[name]}
            </button>
          ))}
          {eqPreset === 'custom' && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white/5 border-white/10 text-zinc-500 italic">
              Custom
            </span>
          )}
        </div>

        {/* Sliders */}
        <div className={`flex gap-0 px-4 pb-5 pt-2 transition-opacity duration-200 ${eqEnabled ? 'opacity-100' : 'opacity-35 pointer-events-none'}`}>

          {/* dB scale */}
          <DbScale />

          {/* Vertical separator */}
          <div className="w-px bg-white/5 mx-2 shrink-0" style={{ marginTop: 8, marginBottom: 24 }} />

          {/* Band columns */}
          <div className="flex flex-1 gap-0">
            {BANDS.map((freq, i) => {
              const gain = eqBands[i] ?? 0
              return (
                <div key={freq} className="flex-1 flex flex-col items-center gap-1.5">
                  {/* dB value */}
                  <span
                    className="text-[10px] tabular-nums font-mono h-4"
                    style={{ color: gain > 0 ? 'var(--color-accent)' : gain < 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {gain > 0 ? `+${gain}` : gain !== 0 ? gain : ''}
                  </span>

                  {/* Slider */}
                  <VerticalSlider
                    value={gain}
                    onChange={(v) => setEqBand(i, v)}
                  />

                  {/* Freq label */}
                  <span className="text-[10px] text-zinc-600 font-mono mt-1">{freq}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
