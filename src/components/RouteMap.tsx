import { useMemo } from "react"
import type { TrackPoint } from "@/trip/types"
import { projectRoute } from "@/trip/stats"
import { cn } from "@/lib/utils"

interface RouteMapProps {
  points: TrackPoint[]
  /** Internal SVG coordinate box; the element itself scales to its container. */
  width?: number
  height?: number
  className?: string
  /** Cap segments for cheap rendering on long rides. */
  maxSegments?: number
  showEndpoints?: boolean
}

/** Slow→fast speed mapped to a blue→orange hue. */
function speedColor(t: number): string {
  const hue = 205 - t * 165
  return `hsl(${hue}, 85%, 58%)`
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)])
  out.push(arr[arr.length - 1])
  return out
}

export function RouteMap({
  points,
  width = 1000,
  height = 600,
  className,
  maxSegments = 600,
  showEndpoints = true,
}: RouteMapProps) {
  const { pts, speedT } = useMemo(
    () => projectRoute(points, width, height, 16),
    [points, width, height],
  )

  const segments = useMemo(() => {
    if (pts.length < 2) return []
    const idx = downsample(
      pts.map((_, i) => i),
      maxSegments,
    )
    const segs: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []
    for (let k = 1; k < idx.length; k++) {
      const a = pts[idx[k - 1]]
      const b = pts[idx[k]]
      segs.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        color: speedColor((speedT[idx[k]] + speedT[idx[k - 1]]) / 2),
      })
    }
    return segs
  }, [pts, speedT, maxSegments])

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-box bg-base-200/50 text-sm opacity-50",
          className,
        )}
      >
        No GPS track yet
      </div>
    )
  }

  const start = pts[0]
  const end = pts[pts.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("rounded-box bg-base-200/50", className)}
      role="img"
      aria-label="Ride route"
    >
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.color}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {showEndpoints && (
        <>
          <circle cx={start.x} cy={start.y} r={9} fill="oklch(0.82 0.16 150)" stroke="white" strokeWidth={2} />
          {pts.length > 1 && (
            <circle cx={end.x} cy={end.y} r={9} fill="oklch(0.7 0.2 20)" stroke="white" strokeWidth={2} />
          )}
        </>
      )}
    </svg>
  )
}
