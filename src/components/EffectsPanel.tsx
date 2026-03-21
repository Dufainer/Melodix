import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Wand2 } from 'lucide-react'
import { useLibraryStore } from '../store'

interface Preset {
  label: string
  emoji: string
  speed: number
  room:  number
  damp:  number
  wet:   number
  e8d:   boolean
  s8d:   number
}

const PRESETS: Record<string, Preset> = {
  normal:       { label: 'Normal',          emoji: '▶',  speed: 1.00, room: 0.00, damp: 0.50, wet: 0.00, e8d: false, s8d: 0.20 },
  slowed:       { label: 'Slowed',          emoji: '🐌', speed: 0.85, room: 0.00, damp: 0.50, wet: 0.00, e8d: false, s8d: 0.20 },
  reverb:       { label: 'Reverb',          emoji: '🌊', speed: 1.00, room: 0.80, damp: 0.50, wet: 0.40, e8d: false, s8d: 0.20 },
  slowedReverb: { label: 'Slowed + Reverb', emoji: '🌙', speed: 0.85, room: 0.85, damp: 0.45, wet: 0.45, e8d: false, s8d: 0.20 },
  vaporwave:    { label: 'Vaporwave',       emoji: '🌸', speed: 0.80, room: 0.90, damp: 0.35, wet: 0.55, e8d: false, s8d: 0.20 },
  nightcore:    { label: 'Nightcore',       emoji: '⚡', speed: 1.25, room: 0.00, damp: 0.50, wet: 0.00, e8d: false, s8d: 0.20 },
  lofi:         { label: 'Lo-fi',           emoji: '🎵', speed: 0.95, room: 0.65, damp: 0.70, wet: 0.30, e8d: false, s8d: 0.20 },
  cathedral:    { label: 'Cathedral',       emoji: '🏛',  speed: 1.00, room: 1.00, damp: 0.20, wet: 0.60, e8d: false, s8d: 0.20 },
  audio8d:      { label: '8D Audio',        emoji: '🎧', speed: 1.00, room: 0.70, damp: 0.40, wet: 0.35, e8d: true,  s8d: 0.20 },
  slow8d:       { label: 'Slowed 8D',       emoji: '🌀', speed: 0.85, room: 0.85, damp: 0.40, wet: 0.40, e8d: true,  s8d: 0.15 },
}

function syncEffects(speed: number, room: number, damp: number, wet: number, e8d: boolean, s8d: number) {
  invoke('player_set_effects', {
    speed, reverbRoom: room, reverbDamp: damp, reverbWet: wet, effect8d: e8d, speed8d: s8d,
  }).catch(() => {})
}

function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-24 shrink-0">{label}</span>
      <div className="relative flex-1 h-1.5">
        <div className="absolute inset-0 rounded-full bg-white/8" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent/60"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-xs font-mono text-zinc-400 w-12 text-right tabular-nums shrink-0">
        {format(value)}
      </span>
    </div>
  )
}

export default function EffectsPanel() {
  const {
    effectsPanelOpen, setEffectsPanelOpen,
    effectSpeed, effectReverbRoom, effectReverbDamp, effectReverbWet,
    effect8d, effect8dSpeed,
    effectPreset, setEffect,
  } = useLibraryStore()

  useEffect(() => {
    syncEffects(effectSpeed, effectReverbRoom, effectReverbDamp, effectReverbWet, effect8d, effect8dSpeed)
  }, [effectSpeed, effectReverbRoom, effectReverbDamp, effectReverbWet, effect8d, effect8dSpeed])

  function applyPreset(key: string) {
    const p = PRESETS[key]
    if (!p) return
    setEffect(p.speed, p.room, p.damp, p.wet, p.e8d, p.s8d, key)
  }

  function handleSlider(field: string, val: number) {
    const s   = field === 'speed' ? val : effectSpeed
    const r   = field === 'room'  ? val : effectReverbRoom
    const d   = field === 'damp'  ? val : effectReverbDamp
    const w   = field === 'wet'   ? val : effectReverbWet
    const s8d = field === 's8d'   ? val : effect8dSpeed
    setEffect(s, r, d, w, effect8d, s8d, 'custom')
  }

  function toggle8d() {
    setEffect(effectSpeed, effectReverbRoom, effectReverbDamp, effectReverbWet, !effect8d, effect8dSpeed, 'custom')
  }

  if (!effectsPanelOpen) return null

  const isNormal = effectSpeed === 1.0 && effectReverbWet === 0.0 && !effect8d

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setEffectsPanelOpen(false)} />

      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50
                      w-[560px] bg-surface border border-white/10 rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-zinc-100">Audio Effects</span>
            {!isNormal && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNormal && (
              <button
                onClick={() => applyPreset('normal')}
                className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 border border-white/10 hover:border-white/20 transition-all"
              >
                Reset
              </button>
            )}
            <button onClick={() => setEffectsPanelOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets grid */}
        <div className="grid grid-cols-5 gap-1.5 px-5 pt-4 pb-3">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all ${
                effectPreset === key
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-white/3 border-white/8 text-zinc-400 hover:bg-white/8 hover:border-white/15 hover:text-zinc-200'
              }`}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className="text-[10px] font-medium leading-tight text-center">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-5 border-t border-white/6" />

        {/* Sliders */}
        <div className="px-5 py-4 space-y-3">
          <SliderRow
            label="Speed / Pitch"
            value={effectSpeed} min={0.5} max={2.0} step={0.01}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => handleSlider('speed', v)}
          />
          <SliderRow
            label="Room size"
            value={effectReverbRoom} min={0} max={1} step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => handleSlider('room', v)}
          />
          <SliderRow
            label="Damping"
            value={effectReverbDamp} min={0} max={1} step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => handleSlider('damp', v)}
          />
          <SliderRow
            label="Wet mix"
            value={effectReverbWet} min={0} max={1} step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => handleSlider('wet', v)}
          />

          {/* 8D section */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-zinc-500 w-24 shrink-0">8D Audio</span>
            <button
              onClick={toggle8d}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                effect8d
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${effect8d ? 'bg-accent' : 'bg-zinc-600'}`} />
              {effect8d ? 'On 🎧' : 'Off'}
            </button>
            {effect8d && (
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1 h-1.5">
                  <div className="absolute inset-0 rounded-full bg-white/8" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent/60"
                    style={{ width: `${((effect8dSpeed - 0.05) / 0.45) * 100}%` }}
                  />
                  <input
                    type="range" min={0.05} max={0.5} step={0.01}
                    value={effect8dSpeed}
                    onChange={(e) => handleSlider('s8d', parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-xs font-mono text-zinc-400 w-16 text-right tabular-nums shrink-0">
                  {effect8dSpeed.toFixed(2)} Hz
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-3 text-[10px] text-zinc-700">
          Speed also shifts pitch · 8D requires stereo headphones · Changes apply in real-time
        </div>
      </div>
    </>
  )
}
