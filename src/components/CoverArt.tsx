import { Music } from 'lucide-react'

interface Props {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-full aspect-square',
}

export default function CoverArt({ src, alt = 'Album cover', size = 'md', className = '' }: Props) {
  const sizeClass = SIZE_MAP[size]

  if (!src) {
    return (
      <div
        className={`${sizeClass} ${className} flex items-center justify-center rounded-lg
                    bg-white/5 border border-white/10 shrink-0`}
      >
        <Music className="w-1/3 h-1/3 text-zinc-600" />
      </div>
    )
  }

  return (
    <img
      src={`data:image/jpeg;base64,${src}`}
      alt={alt}
      className={`${sizeClass} ${className} rounded-lg object-cover shrink-0 border border-white/10`}
    />
  )
}
