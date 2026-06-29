/**
 * Export rides to downloadable files. No network, no Google APIs — the backup
 * JSON is a plain file the user uploads to Drive (or anywhere) themselves, and
 * which `import.ts` can read back to restore a cleared device.
 */

import { SCHEMA_VERSION } from "./storage"
import { computeStats } from "./stats"
import type { Trip } from "./types"

export interface BackupFile {
  app: "bicycle"
  schemaVersion: number
  exportedAt: string
  trips: Trip[]
}

/** Build the full-history backup object. */
export function buildBackup(trips: Trip[]): BackupFile {
  return {
    app: "bicycle",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    trips,
  }
}

function triggerDownload(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function stamp(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Filesystem-safe slug from a ride title + start date. */
function slug(trip: Trip): string {
  const base = `${stamp(new Date(trip.startedAt))}-${trip.title}`
  return base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
}

/** Download the entire history as one backup JSON. */
export function downloadBackup(trips: Trip[]): void {
  triggerDownload(
    `bicycle-backup-${stamp()}.json`,
    "application/json",
    JSON.stringify(buildBackup(trips), null, 2),
  )
}

/** Download a single ride as JSON (full fidelity, importable). */
export function downloadTripJson(trip: Trip): void {
  triggerDownload(
    `${slug(trip)}.json`,
    "application/json",
    JSON.stringify(buildBackup([trip]), null, 2),
  )
}

/** Build the CSV (one row per track point) for a ride. Pure. */
export function tripToCsv(trip: Trip): string {
  const header = "timestamp,latitude,longitude,altitude_m,speed_ms,accuracy_m,heading_deg"
  const rows = trip.points.map((p) =>
    [
      new Date(p.t).toISOString(),
      p.lat,
      p.lng,
      p.alt ?? "",
      p.speed ?? "",
      p.accuracy ?? "",
      p.heading ?? "",
    ].join(","),
  )
  return [header, ...rows].join("\n")
}

/** Build a GPX 1.1 document for a ride (opens in Strava, Garmin, etc.). Pure. */
export function tripToGpx(trip: Trip): string {
  const stats = computeStats(trip)
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const trkpts = trip.points
    .map((p) => {
      const ele = typeof p.alt === "number" ? `\n        <ele>${p.alt.toFixed(1)}</ele>` : ""
      const time = `\n        <time>${new Date(p.t).toISOString()}</time>`
      const speed =
        typeof p.speed === "number"
          ? `\n        <extensions><speed>${p.speed.toFixed(2)}</speed></extensions>`
          : ""
      return `      <trkpt lat="${p.lat}" lon="${p.lng}">${ele}${time}${speed}\n      </trkpt>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bicycle" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(trip.title)}</name>
    <time>${new Date(trip.startedAt).toISOString()}</time>
    <desc>Distance ${(stats.distanceM / 1000).toFixed(2)} km, ascent ${Math.round(stats.ascentM)} m</desc>
  </metadata>
  <trk>
    <name>${esc(trip.title)}</name>
    <type>cycling</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

/** Download a single ride as a CSV of track points (for spreadsheets). */
export function downloadTripCsv(trip: Trip): void {
  triggerDownload(`${slug(trip)}.csv`, "text/csv", tripToCsv(trip))
}

/** Download a single ride as GPX 1.1. */
export function downloadTripGpx(trip: Trip): void {
  triggerDownload(`${slug(trip)}.gpx`, "application/gpx+xml", tripToGpx(trip))
}
