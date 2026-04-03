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
  const performanceMode = useLibraryStore(s => s.performanceMode)
  const [src, setSrc] = useState<string | undefined>(coverArt)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateTrack = useLibraryStore(s => s.updateTrack)

  // In performance mode: skip cover loading entirely
  useEffect(() => {
    if (performanceMode) return
    if (src) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [path, src, performanceMode])

  useEffect(() => {
    if (performanceMode || !visible || src) return
    fetchCover(path)
      .then(art => {
        if (art) {
          setSrc(art)
          updateTrack(path, { coverArt: art })
        }
      })
      .catch(() => {})
  }, [visible, path, performanceMode])

  const placeholder = (
    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
      <Music2 style={{ width: iconSize, height: iconSize }} className="text-zinc-600" />
    </div>
  )

  if (performanceMode) {
    return <div ref={ref} className={`${className} overflow-hidden`}>{placeholder}</div>
  }

  return (
    <div ref={ref} className={`${className} overflow-hidden`}>
      {src ? (
        <img
          src={`data:image/jpeg;base64,${src}`}
          alt=""
          className="w-full h-full object-cover animate-fade-in"
        />
      ) : placeholder}
    </div>
  )
}
