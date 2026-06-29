/**
 * Thin wrapper over the browser Geolocation API. Normalises a `Position` into
 * our `TrackPoint` and exposes a single `watch()` that returns a stop fn.
 */

import type { TrackPoint } from "./types"

export interface GeoError {
  code: number
  message: string
}

export function geolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator
}

export function toTrackPoint(pos: GeolocationPosition): TrackPoint {
  const c = pos.coords
  return {
    t: pos.timestamp,
    lat: c.latitude,
    lng: c.longitude,
    alt: c.altitude ?? null,
    speed: c.speed ?? null,
    accuracy: c.accuracy ?? null,
    heading: c.heading ?? null,
  }
}

export interface WatchOptions {
  onPoint: (p: TrackPoint, raw: GeolocationPosition) => void
  onError?: (e: GeoError) => void
}

/**
 * Start a high-accuracy position watch. Returns a function that cancels it.
 */
export function watch({ onPoint, onError }: WatchOptions): () => void {
  if (!geolocationSupported()) {
    onError?.({ code: -1, message: "Geolocation is not available on this device." })
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPoint(toTrackPoint(pos), pos),
    (err) => onError?.({ code: err.code, message: err.message }),
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** One-shot current position (used to fetch weather at ride start). */
export function currentPosition(): Promise<TrackPoint> {
  return new Promise((resolve, reject) => {
    if (!geolocationSupported()) {
      reject(new Error("Geolocation unavailable"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toTrackPoint(pos)),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  })
}
