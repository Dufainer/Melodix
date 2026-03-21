import { useRef, useState, useMemo, useEffect } from 'react'

interface Props {
  position: number
  duration: number
  onSeek: (s: number) => void
  uid: string
  height?: number
  amplitude?: number
  strokeWidth?: number
  dotRadius?: number
}

const W = 1000
const PERIOD = 120 // 👈 ondas más largas = más suaves

function makeSinePath(H: number, amp: number): string {
  const step = 8 // menos puntos = más fluido
  let d = `M0,${H / 2}`

  for (let x = 0; x <= W + PERIOD; x += step) {
    const y = H / 2 + amp * Math.sin((x / PERIOD) * Math.PI * 2)
    d += ` L${x},${y.toFixed(2)}`
  }

  return d
}

export default function WaveSeekBar({
  position,
  duration,
  onSeek,
  uid,
  height = 48,
  amplitude = 6, // 👈 menor intensidad
  strokeWidth = 3,
  dotRadius,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const waveRef = useRef<SVGGElement>(null)

  const [localPos, setLocalPos] = useState<number | null>(null)
  const displayed = localPos ?? position
  const progress = duration > 0 ? Math.min(displayed / duration, 1) : 0

  const H = height
  const playheadX = progress * W
  const dot = dotRadius ?? amplitude * 0.9

  // 👇 suaviza aún más la amplitud
  const softAmp = amplitude * 0.6

  const sineD = useMemo(() => makeSinePath(H, softAmp), [H, softAmp])

  // 🚀 Animación fluida con requestAnimationFrame
  useEffect(() => {
    let frame: number
    let offset = 0

    const animate = () => {
      offset -= 0.5 // velocidad suave
      if (offset <= -PERIOD) offset = 0

      if (waveRef.current) {
        waveRef.current.style.transform = `translateX(${offset}px)`
      }

      frame = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(frame)
  }, [])

  function posFromX(clientX: number) {
    if (!svgRef.current || duration <= 0) return displayed
    const rect = svgRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setLocalPos(posFromX(e.clientX))

    const onMove = (ev: MouseEvent) => setLocalPos(posFromX(ev.clientX))
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setLocalPos(null)
      onSeek(posFromX(ev.clientX))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{
        width: '100%',
        height,
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
    >
      <defs>
        <clipPath id={`${uid}-p`}>
          <rect x={0} y={0} width={playheadX} height={H} />
        </clipPath>
      </defs>

      {/* Línea base */}
      <line
        x1={playheadX}
        y1={H / 2}
        x2={W}
        y2={H / 2}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Onda animada */}
      <g clipPath={`url(#${uid}-p)`}>
        <g ref={waveRef} style={{ willChange: 'transform' }}>
          <path
            d={sineD}
            fill="none"
            stroke="var(--color-accent,#818cf8)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Punto */}
      {duration > 0 && (
        <circle cx={playheadX} cy={H / 2} r={dot} fill="white" />
      )}
    </svg>
  )
}
