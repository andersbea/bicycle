import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { TrackPoint } from "@/trip/types"
import { speeds } from "@/trip/stats"
import { cn } from "@/lib/utils"

interface TripMapProps {
  points: TrackPoint[]
  className?: string
  /** Cap rendered segments for long rides. */
  maxSegments?: number
}

/** Slow→fast speed mapped to a blue→orange hue (matches the SVG RouteMap). */
function speedColor(t: number): string {
  const hue = 205 - t * 165
  return `hsl(${hue}, 85%, 55%)`
}

function downsampleIndices(len: number, max: number): number[] {
  if (len <= max) return Array.from({ length: len }, (_, i) => i)
  const out: number[] = []
  const step = len / max
  for (let i = 0; i < max; i++) out.push(Math.floor(i * step))
  out.push(len - 1)
  return out
}

/**
 * Real slippy map (Leaflet + OpenStreetMap tiles) with the ride's GPS track
 * drawn on top, speed-coloured. Needs network for tiles; degrades to a grey
 * canvas offline. Used on the ride detail view.
 */
export function TripMap({ points, className, maxSegments = 400 }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || points.length === 0) return

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      // Touch-friendly without hijacking page scroll on mobile.
      scrollWheelZoom: false,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 16)
    } else {
      // Speed-coloured segments (downsampled for long rides).
      const spd = speeds(points)
      const maxS = Math.max(1e-6, ...spd)
      const idx = downsampleIndices(latlngs.length, maxSegments)
      for (let k = 1; k < idx.length; k++) {
        const a = idx[k - 1]
        const b = idx[k]
        const t = (spd[a] + spd[b]) / 2 / maxS
        L.polyline([latlngs[a], latlngs[b]], {
          color: speedColor(Math.max(0, Math.min(1, t))),
          weight: 5,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map)
      }
      map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] })
    }

    // Start / end markers (vector circles — no image assets to 404 on).
    L.circleMarker(latlngs[0], {
      radius: 6,
      color: "#fff",
      weight: 2,
      fillColor: "#22c55e",
      fillOpacity: 1,
    }).addTo(map)
    if (latlngs.length > 1) {
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6,
        color: "#fff",
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: 1,
      }).addTo(map)
    }

    // The container is often sized by fl/grid after mount — recompute once laid out.
    const raf = requestAnimationFrame(() => map.invalidateSize())

    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
  }, [points, maxSegments])

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-box bg-base-200/50 text-sm opacity-50",
          className,
        )}
      >
        No GPS track recorded
      </div>
    )
  }

  return <div ref={containerRef} className={cn("z-0 overflow-hidden rounded-box", className)} />
}
