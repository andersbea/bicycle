/**
 * Pure geometry / statistics helpers. No React, no storage — everything here
 * takes plain data and returns plain data, so it's trivially unit-testable and
 * reused by both the live tracker and the history/trends views.
 */

import type { TrackPoint, Trip, TripStats } from "./types"

const EARTH_R = 6_371_000 // metres

/**
 * Speeds above this are treated as GPS glitches and ignored — a single noisy
 * fix can otherwise report hundreds of km/h and wreck the max/average. Set to
 * 80 km/h, above any realistic ride (incl. fast descents).
 */
const MAX_PLAUSIBLE_SPEED = 80 / 3.6 // m/s

/** Great-circle distance between two coordinates, in metres. */
export function haversine(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cumulative distance (metres) at each point — index-aligned with `points`. */
export function cumulativeDistance(points: TrackPoint[]): number[] {
  const out = new Array<number>(points.length).fill(0)
  for (let i = 1; i < points.length; i++) {
    const d = haversine(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng,
    )
    out[i] = out[i - 1] + d
  }
  return out
}

/**
 * Per-point speed in m/s. Uses the GPS-reported speed when present and sane,
 * otherwise derives it from the distance/time delta to the previous point.
 */
export function speeds(points: TrackPoint[]): number[] {
  const out = new Array<number>(points.length).fill(0)
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const prev = points[i - 1]
    let v: number
    if (typeof p.speed === "number" && p.speed >= 0 && Number.isFinite(p.speed)) {
      v = p.speed
    } else {
      const dt = (p.t - prev.t) / 1000
      const dist = haversine(prev.lat, prev.lng, p.lat, p.lng)
      v = dt > 0 ? dist / dt : out[i - 1]
    }
    // Reject implausible spikes (GPS noise) — carry the previous good value.
    out[i] = Number.isFinite(v) && v >= 0 && v <= MAX_PLAUSIBLE_SPEED ? v : out[i - 1]
  }
  if (points.length > 1) out[0] = out[1]
  return out
}

/**
 * Windowed-median smoothing — robust against the spikes that consumer GPS
 * altitude is notorious for. `window` is the half-not full count of neighbours.
 */
function medianSmooth(values: number[], window = 2): number[] {
  if (values.length === 0) return []
  const out = new Array<number>(values.length)
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - window)
    const hi = Math.min(values.length - 1, i + window)
    const slice = values.slice(lo, hi + 1).sort((a, b) => a - b)
    out[i] = slice[Math.floor(slice.length / 2)]
  }
  return out
}

/** Smoothed altitudes (metres), or null if no point carries altitude. */
export function smoothedAltitudes(points: TrackPoint[]): number[] | null {
  const hasAlt = points.some((p) => typeof p.alt === "number")
  if (!hasAlt) return null
  // Forward-fill missing samples so a single dropout doesn't zero the series.
  let last = 0
  const raw = points.map((p) => {
    if (typeof p.alt === "number" && Number.isFinite(p.alt)) last = p.alt
    return last
  })
  return medianSmooth(raw, 2)
}

/** Compute all derived statistics for a trip. */
export function computeStats(trip: Trip): TripStats {
  const pts = trip.points
  const n = pts.length

  const empty: TripStats = {
    distanceM: 0,
    durationMs: 0,
    movingMs: 0,
    avgSpeed: 0,
    avgSpeedOverall: 0,
    maxSpeed: 0,
    ascentM: 0,
    descentM: 0,
    maxGrade: 0,
    minAlt: null,
    maxAlt: null,
    pointCount: n,
  }
  if (n === 0) return empty

  const cum = cumulativeDistance(pts)
  const distanceM = cum[n - 1]
  const spd = speeds(pts)

  const end = trip.endedAt ?? pts[n - 1].t
  const durationMs = Math.max(0, end - trip.startedAt - (trip.pausedMs ?? 0))

  // Moving time AND moving distance, accumulated over the SAME segments, so the
  // moving average can't blow up. (Previously total distance ÷ moving time
  // produced absurd values — e.g. one big GPS-dropout jump over a short moving
  // window reading 1000+ km/h.) A segment counts as "moving" when it's recent
  // (no long gap) and above a walking-pace floor.
  const MOVING_FLOOR = 0.8 // m/s ≈ 2.9 km/h
  const MAX_GAP_MS = 60_000
  let movingMs = 0
  let movingDistM = 0
  for (let i = 1; i < n; i++) {
    const dt = pts[i].t - pts[i - 1].t
    if (dt > 0 && dt < MAX_GAP_MS && spd[i] >= MOVING_FLOOR) {
      movingMs += dt
      movingDistM += cum[i] - cum[i - 1]
    }
  }

  const maxSpeed = spd.reduce((m, s) => (s > m ? s : m), 0)
  const avgSpeed = movingMs > 0 ? movingDistM / (movingMs / 1000) : 0
  const avgSpeedOverall =
    durationMs > 0 ? distanceM / (durationMs / 1000) : 0

  // Elevation from smoothed altitudes, accumulating only deltas above a noise
  // threshold so flat-but-jittery sections don't inflate the totals.
  let ascentM = 0
  let descentM = 0
  let maxGrade = 0
  let minAlt: number | null = null
  let maxAlt: number | null = null
  const alts = smoothedAltitudes(pts)
  if (alts) {
    const NOISE = 1 // metres
    let refAlt = alts[0]
    minAlt = alts[0]
    maxAlt = alts[0]
    for (let i = 1; i < n; i++) {
      const a = alts[i]
      minAlt = Math.min(minAlt, a)
      maxAlt = Math.max(maxAlt, a)
      const delta = a - refAlt
      if (Math.abs(delta) >= NOISE) {
        if (delta > 0) ascentM += delta
        else descentM += -delta
        refAlt = a
      }
      // Grade over the immediate segment, ignoring tiny horizontal moves.
      const horiz = cum[i] - cum[i - 1]
      if (horiz > 4) {
        const grade = (alts[i] - alts[i - 1]) / horiz
        if (grade > maxGrade) maxGrade = grade
      }
    }
  }

  return {
    distanceM,
    durationMs,
    movingMs,
    avgSpeed,
    avgSpeedOverall,
    maxSpeed,
    ascentM,
    descentM,
    maxGrade,
    minAlt,
    maxAlt,
    pointCount: n,
  }
}

export interface Projected {
  pts: { x: number; y: number }[]
  /** Normalised speed 0..1 per point, for colour-coding the route. */
  speedT: number[]
}

/**
 * Project lat/lng to SVG coordinates inside a `width`×`height` box (with
 * `pad` margin), preserving aspect ratio via an equirectangular projection
 * scaled by latitude. Returns screen points + a normalised speed channel.
 */
export function projectRoute(
  points: TrackPoint[],
  width: number,
  height: number,
  pad = 8,
): Projected {
  if (points.length === 0) return { pts: [], speedT: [] }

  const latRad = (points[0].lat * Math.PI) / 180
  const xs = points.map((p) => p.lng * Math.cos(latRad))
  const ys = points.map((p) => p.lat)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const spanX = maxX - minX || 1e-6
  const spanY = maxY - minY || 1e-6
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const scale = Math.min(innerW / spanX, innerH / spanY)

  // Centre the route within the box.
  const offX = pad + (innerW - spanX * scale) / 2
  const offY = pad + (innerH - spanY * scale) / 2

  const pts = points.map((_, i) => ({
    x: offX + (xs[i] - minX) * scale,
    // Flip Y: latitude increases northward but SVG y grows downward.
    y: offY + (maxY - ys[i]) * scale,
  }))

  const spd = speeds(points)
  const maxS = Math.max(1e-6, ...spd)
  const speedT = spd.map((s) => Math.max(0, Math.min(1, s / maxS)))

  return { pts, speedT }
}

/** Distance-vs-altitude pairs for the elevation profile sparkline. */
export function elevationProfile(
  points: TrackPoint[],
): { d: number; alt: number }[] {
  const alts = smoothedAltitudes(points)
  if (!alts) return []
  const cum = cumulativeDistance(points)
  return points.map((_, i) => ({ d: cum[i], alt: alts[i] }))
}
