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
}

/** Lightweight area/line chart — no chart library. */
export function Sparkline({
  data,
  width = 1000,
  height = 240,
  className,
  stroke = "var(--color-primary)",
  fill = true,
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

    const pts = data.map((d) => `${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`)
    const line = `M${pts.join(" L")}`
    const area = `${line} L${sx(maxX).toFixed(1)},${height - pad} L${sx(minX).toFixed(1)},${height - pad} Z`
    return { line, area }
  }, [data, width, height])

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
      <path d={line} fill="none" stroke={stroke} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
