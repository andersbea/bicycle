/**
 * Shared colours for the route line and start/end markers, used by both the
 * SVG RouteMap (thumbnails / live trail) and the Leaflet TripMap, so the route
 * looks consistent everywhere and matches the app's cyan→violet accent palette.
 */

/** Slow→fast speed (0..1) mapped to a cyan→violet gradient (on-theme). */
export function speedColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  const hue = 188 + c * 95 // 188 (cyan) → 283 (violet)
  const light = 60 - c * 4
  return `hsl(${hue}, 80%, ${light}%)`
}

/** Start marker — emerald/teal ("go"), sits in the app's accent family. */
export const START_COLOR = "hsl(160, 72%, 46%)"
/** End marker — magenta ("stop"), matches the app's secondary accent. */
export const END_COLOR = "hsl(322, 78%, 60%)"
/** Marker outline — reads on both light and dark basemaps. */
export const MARKER_RING = "#ffffff"
