import { useEffect, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { useLibraryStore } from '../store'
import { fetchCover } from '../lib/coverQueue'

interface Props {
  src?: string
  path?: string   // when provided and src is missing, lazy-loads the cover
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-full aspect-square',
}

export default function CoverArt({ src, path, alt = 'Album cover', size = 'md', className = '' }: Props) {
  const sizeClass = SIZE_MAP[size]
  const [lazySrc, setLazySrc] = useState<string | undefined>(src)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateTrack = useLibraryStore(s => s.updateTrack)

  useEffect(() => { if (src) setLazySrc(src) }, [src])

  useEffect(() => {
    if (lazySrc || !path) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [path, lazySrc])

  useEffect(() => {
    if (!visible || lazySrc || !path) return
    fetchCover(path)
      .then(art => {
        if (art) {
          setLazySrc(art)
          updateTrack(path, { coverArt: art })
        }
      })
      .catch(() => {})
  }, [visible, path])

  if (!lazySrc) {
    return (
      <div
        ref={ref}
        className={`${sizeClass} ${className} flex items-center justify-center rounded-lg
                    bg-white/5 border border-white/10 shrink-0`}
      >
        <Music className="w-1/3 h-1/3 text-zinc-600" />
      </div>
    )
  }

  return (
    <img
      src={`data:image/jpeg;base64,${lazySrc}`}
      alt={alt}
      className={`${sizeClass} ${className} rounded-lg object-cover shrink-0 border border-white/10 animate-fade-in`}
    />
  )
}
