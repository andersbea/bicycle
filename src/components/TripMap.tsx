import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { X } from "lucide-react"
import type { TrackPoint } from "@/trip/types"
import { speeds } from "@/trip/stats"
import { cn } from "@/lib/utils"
import { speedColor, START_COLOR, END_COLOR, MARKER_RING } from "./mapColors"

interface TripMapProps {
  points: TrackPoint[]
  className?: string
  /** Use the dark minimalist basemap (to match the app theme). */
  dark?: boolean
  /** Enable pan / zoom / scroll. Off = static preview. */
  interactive?: boolean
  /** Cap rendered segments for long rides. */
  maxSegments?: number
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
 * Slippy map with a minimalist CARTO basemap (light/dark to match the app) and
 * the ride's GPS track on top, speed-coloured. No zoom buttons or attribution
 * chrome — interaction is via gestures in the expanded modal. Needs network for
 * tiles; degrades to a blank canvas offline.
 */
export function TripMap({
  points,
  className,
  dark = true,
  interactive = false,
  maxSegments = 400,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || points.length === 0) return

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    })

    // CARTO minimalist basemaps — muted, label-light, matching the app's look.
    const variant = dark ? "dark_all" : "light_all"
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`, {
      subdomains: "abcd",
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map)

    // The default CARTO dark basemap is near-black with very low land/street
    // contrast — lift it to a charcoal so the street network stays legible.
    if (dark) {
      const pane = map.getPane("tilePane")
      if (pane) pane.style.filter = "brightness(1.85) contrast(1.05)"
    }

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 16)
    } else {
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
          opacity: 0.95,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map)
      }
      map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] })
    }

    // Start / end markers (vector circles — no image assets to 404 on).
    L.circleMarker(latlngs[0], {
      radius: 6,
      color: MARKER_RING,
      weight: 2,
      fillColor: START_COLOR,
      fillOpacity: 1,
    }).addTo(map)
    if (latlngs.length > 1) {
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6,
        color: MARKER_RING,
        weight: 2,
        fillColor: END_COLOR,
        fillOpacity: 1,
      }).addTo(map)
    }

    const raf = requestAnimationFrame(() => map.invalidateSize())

    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
  }, [points, dark, interactive, maxSegments])

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

/** Full-screen, gesture-driven map view opened from the detail preview. */
export function TripMapModal({
  points,
  title,
  dark,
  onClose,
}: {
  points: TrackPoint[]
  title: string
  dark: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-base-100">
      <div className="flex items-center gap-2 px-3 py-2 safe-top safe-x">
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
          aria-label="Close map"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="truncate font-semibold">{title}</span>
      </div>
      <TripMap points={points} dark={dark} interactive className="min-h-0 flex-1 rounded-none" />
    </div>
  )
}
