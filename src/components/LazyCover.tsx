import { useEffect, useRef, useState } from 'react'
import { Music2 } from 'lucide-react'
import { useLibraryStore } from '../store'
import { fetchCover } from '../lib/coverQueue'

interface Props {
  path: string
  coverArt?: string
  className?: string
  iconSize?: number
}

export default function LazyCover({ path, coverArt, className = 'w-full h-full', iconSize = 32 }: Props) {
  const [src, setSrc] = useState<string | undefined>(coverArt)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateTrack = useLibraryStore(s => s.updateTrack)

  // Observe visibility
  useEffect(() => {
    if (src) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [path, src])

  // Fetch cover when visible
  useEffect(() => {
    if (!visible || src) return
    fetchCover(path)
      .then(art => {
        if (art) {
          setSrc(art)
          updateTrack(path, { coverArt: art })
        }
      })
      .catch(() => {})
  }, [visible, path])

  return (
    <div ref={ref} className={`${className} overflow-hidden`}>
      {src ? (
        <img
          src={`data:image/jpeg;base64,${src}`}
          alt=""
          className="w-full h-full object-cover animate-fade-in"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700/40 to-zinc-900">
          <Music2 style={{ width: iconSize, height: iconSize }} className="text-zinc-600" />
        </div>
      )}
    </div>
  )
}
