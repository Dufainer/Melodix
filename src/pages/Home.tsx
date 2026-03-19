import { Disc3, FolderOpen, Zap, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon: FolderOpen,
    title: 'Scan Folders',
    desc: 'Recursively scan music directories and load your entire library in seconds.',
  },
  {
    icon: Disc3,
    title: 'FLAC Support',
    desc: 'Full read/write support for FLAC metadata including embedded cover art.',
  },
  {
    icon: Globe,
    title: 'Auto-Fetch Metadata',
    desc: 'Lookup missing metadata from MusicBrainz and Discogs with one click.',
  },
  {
    icon: Zap,
    title: 'More Formats Coming',
    desc: 'Architecture supports MP3, AAC, OGG, OPUS, WAV, AIFF — roadmap in progress.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <Disc3 className="w-16 h-16 text-accent mb-4 opacity-80" />
      <h1 className="text-3xl font-bold text-white mb-2">Melodix</h1>
      <p className="text-zinc-400 text-base max-w-md mb-10">
        A modern audio metadata manager. Scan your library, edit tags, and fetch
        artwork — all in one place.
      </p>

      <button
        className="btn-primary text-sm px-6 py-2.5 mb-12"
        onClick={() => navigate('/library')}
      >
        Go to Library
      </button>

      <div className="grid grid-cols-2 gap-4 max-w-xl w-full">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-card text-left">
            <Icon className="w-5 h-5 text-accent mb-3" />
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
