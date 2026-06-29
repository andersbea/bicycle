/**
 * localStorage persistence for rides.
 *
 * Two slots:
 *  - TRIPS_KEY     : the array of finished rides (the history).
 *  - ACTIVE_KEY    : the single in-progress ride, autosaved every few seconds
 *                    while recording so a crash / reload / backgrounded tab
 *                    doesn't lose the ride.
 *
 * Everything is validated on read; anything that doesn't look like a Trip is
 * dropped rather than allowed to crash the app.
 */

import type { Trip, TrackPoint } from "./types"

export const SCHEMA_VERSION = 1
export const TRIPS_KEY = "bicycle.trips.v1"
export const ACTIVE_KEY = "bicycle.activeTrip.v1"

function isPoint(p: unknown): p is TrackPoint {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as TrackPoint).t === "number" &&
    typeof (p as TrackPoint).lat === "number" &&
    typeof (p as TrackPoint).lng === "number"
  )
}

/** Validate (and lightly normalise) an unknown value into a Trip, or null. */
export function validateTrip(value: unknown): Trip | null {
  if (!value || typeof value !== "object") return null
  const t = value as Partial<Trip>
  if (
    typeof t.id !== "string" ||
    typeof t.startedAt !== "number" ||
    !Array.isArray(t.points) ||
    !["recording", "paused", "finished"].includes(t.status as string)
  ) {
    return null
  }
  return {
    id: t.id,
    title: typeof t.title === "string" ? t.title : "Ride",
    startedAt: t.startedAt,
    endedAt: typeof t.endedAt === "number" ? t.endedAt : undefined,
    points: (t.points as unknown[]).filter(isPoint) as TrackPoint[],
    weather: Array.isArray(t.weather) ? t.weather : [],
    status: t.status as Trip["status"],
    pausedMs: typeof t.pausedMs === "number" ? t.pausedMs : 0,
    note: typeof t.note === "string" ? t.note : undefined,
  }
}

export function loadTrips(): Trip[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(TRIPS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(validateTrip).filter((t): t is Trip => t !== null)
  } catch {
    return []
  }
}

export function saveTrips(trips: Trip[]): void {
  try {
    window.localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
  } catch {
    // ignore quota errors
  }
}

export function getTrip(id: string): Trip | undefined {
  return loadTrips().find((t) => t.id === id)
}

/** Insert or replace a ride by id, keeping the list sorted newest-first. */
export function upsertTrip(trip: Trip): Trip[] {
  const trips = loadTrips().filter((t) => t.id !== trip.id)
  trips.push(trip)
  trips.sort((a, b) => b.startedAt - a.startedAt)
  saveTrips(trips)
  return trips
}

export function deleteTrip(id: string): Trip[] {
  const trips = loadTrips().filter((t) => t.id !== id)
  saveTrips(trips)
  return trips
}

export function clearAllTrips(): void {
  try {
    window.localStorage.removeItem(TRIPS_KEY)
    window.localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignore
  }
}

export function loadActiveTrip(): Trip | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    return validateTrip(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveActiveTrip(trip: Trip | null): void {
  try {
    if (trip) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(trip))
    else window.localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignore
  }
}

export type MergeMode = "merge" | "replace"

export interface MergeResult {
  added: number
  updated: number
  total: number
  trips: Trip[]
}

/**
 * Merge imported rides into storage. In "merge" mode existing rides win on id
 * collision (added = new ids); in "replace" mode the imported set becomes the
 * whole history.
 */
export function mergeImported(incoming: Trip[], mode: MergeMode): MergeResult {
  if (mode === "replace") {
    const sorted = [...incoming].sort((a, b) => b.startedAt - a.startedAt)
    saveTrips(sorted)
    return { added: sorted.length, updated: 0, total: sorted.length, trips: sorted }
  }

  const existing = loadTrips()
  const byId = new Map(existing.map((t) => [t.id, t]))
  let added = 0
  for (const t of incoming) {
    if (!byId.has(t.id)) {
      byId.set(t.id, t)
      added++
    }
  }
  const merged = [...byId.values()].sort((a, b) => b.startedAt - a.startedAt)
  saveTrips(merged)
  return { added, updated: 0, total: merged.length, trips: merged }
}
