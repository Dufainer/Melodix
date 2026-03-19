import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

export default function Settings() {
  const [supportedFormats, setSupportedFormats] = useState<string[]>([])

  useEffect(() => {
    invoke<string[]>('get_supported_formats').then(setSupportedFormats).catch(console.error)
  }, [])

  return (
    <div className="px-8 py-8 max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Supported Formats</h2>
        <div className="glass-card">
          <div className="flex flex-wrap gap-2">
            {supportedFormats.length === 0
              ? <p className="text-sm text-zinc-500">Loading…</p>
              : supportedFormats.map((ext) => (
                  <span key={ext} className="format-badge bg-accent/15 text-accent border-accent/30">
                    {ext.toUpperCase()}
                  </span>
                ))
            }
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Additional formats (MP3, AAC, OGG, OPUS, WAV, AIFF) are on the roadmap.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">About</h2>
        <div className="glass-card flex items-start gap-3">
          <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <div className="text-sm text-zinc-400 space-y-1">
            <p>Melodix v0.1.0</p>
            <p className="text-zinc-600 text-xs">
              Built with Tauri v2 + React 19 + TypeScript + TailwindCSS v4
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
