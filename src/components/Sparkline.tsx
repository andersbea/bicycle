import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface SparklineProps {
  /** Data points in arbitrary x/y units; auto-scaled to the viewBox. */
  data: { x: number; y: number }[]
  width?: number
  height?: number
  className?: string
  stroke?: string
  fill?: boolean
  /** Render a smooth (curved) line instead of straight segments. */
  smooth?: boolean
}

/** Build a smooth path through points using a Catmull-Rom → cubic-Bézier
 * conversion, so inclines/declines read as soft curves rather than jagged
 * segments. `tension` of 6 ≈ the classic Catmull-Rom. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ""
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

function straightPath(pts: { x: number; y: number }[]): string {
  return `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`
}

/** Lightweight area/line chart — no chart library. */
export function Sparkline({
  data,
  width = 1000,
  height = 240,
  className,
  stroke = "var(--color-primary)",
  fill = true,
  smooth = true,
}: SparklineProps) {
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" }
    const pad = 6
    const xs = data.map((d) => d.x)
    const ys = data.map((d) => d.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spanX = maxX - minX || 1
    const spanY = maxY - minY || 1
    const sx = (x: number) => pad + ((x - minX) / spanX) * (width - pad * 2)
    const sy = (y: number) => height - pad - ((y - minY) / spanY) * (height - pad * 2)

    const screen = data.map((d) => ({ x: sx(d.x), y: sy(d.y) }))
    const line = smooth ? smoothPath(screen) : straightPath(screen)
    const area = `${line} L${sx(maxX).toFixed(1)},${height - pad} L${sx(minX).toFixed(1)},${height - pad} Z`
    return { line, area }
  }, [data, width, height, smooth])

  if (data.length < 2) {
    return (
      <div className={cn("flex items-center justify-center text-xs opacity-40", className)}>
        Not enough data
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      role="img"
      aria-label="Chart"
    >
      {fill && <path d={area} fill={stroke} opacity={0.14} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
