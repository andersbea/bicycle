/**
 * Metric formatters. The app is metric-only by design, so these are the single
 * source of truth for how every number is rendered.
 */

/** m/s → km/h string, e.g. "24.3". */
export function kmh(mps: number, digits = 1): string {
  return (mps * 3.6).toFixed(digits)
}

/** metres → distance string with adaptive unit, e.g. "850 m" / "12.4 km". */
export function distance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`
}

/** metres → "12.43" km number only (no unit), for tables/charts. */
export function km(m: number, digits = 2): string {
  return (m / 1000).toFixed(digits)
}

/** metres of elevation → "1,240 m". */
export function metres(m: number): string {
  return `${Math.round(m).toLocaleString("en-US")} m`
}

/** °C → "18°". */
export function temp(c: number): string {
  return `${Math.round(c)}°`
}

/** fraction → "8.2%". */
export function percent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

/** ms → "1:23:45" or "23:45". */
export function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** ms → compact "1h 23m" / "23m" for cards. */
export function durationShort(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${total}s`
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
})
const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})

export function rideDate(epochMs: number): string {
  return DATE_FMT.format(new Date(epochMs))
}

export function rideTime(epochMs: number): string {
  return TIME_FMT.format(new Date(epochMs))
}

/** Compass bearing in degrees → "NE". */
export function compass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(((deg % 360) / 45)) % 8]
}
