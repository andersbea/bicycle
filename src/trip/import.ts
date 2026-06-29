/**
 * Restore rides from a backup JSON file produced by export.ts. This is the
 * recovery path when localStorage is cleared: re-download the backup from
 * Google Drive, import it here.
 */

import { mergeImported, validateTrip, type MergeMode, type MergeResult } from "./storage"
import type { Trip } from "./types"

export interface ParseResult {
  ok: boolean
  error?: string
  trips: Trip[]
  skipped: number
}

/** Parse + validate a backup file's text. Accepts the wrapped backup shape or
 * a bare array of trips, and tolerates partial corruption (skips bad rides). */
export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON.", trips: [], skipped: 0 }
  }

  let rawTrips: unknown[]
  if (Array.isArray(data)) {
    rawTrips = data
  } else if (data && typeof data === "object" && Array.isArray((data as { trips?: unknown[] }).trips)) {
    rawTrips = (data as { trips: unknown[] }).trips
  } else {
    return {
      ok: false,
      error: "Unrecognised file — expected a Bicycle backup.",
      trips: [],
      skipped: 0,
    }
  }

  const trips: Trip[] = []
  let skipped = 0
  for (const raw of rawTrips) {
    const t = validateTrip(raw)
    if (t) trips.push(t)
    else skipped++
  }

  if (trips.length === 0) {
    return { ok: false, error: "No valid rides found in that file.", trips: [], skipped }
  }
  return { ok: true, trips, skipped }
}

/** Read a File (from <input type=file>) and parse it. */
export function readBackupFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(parseBackup(String(reader.result ?? "")))
    reader.onerror = () =>
      resolve({ ok: false, error: "Couldn't read that file.", trips: [], skipped: 0 })
    reader.readAsText(file)
  })
}

/** Parse + apply in one step. */
export async function importBackupFile(
  file: File,
  mode: MergeMode,
): Promise<{ parse: ParseResult; merge?: MergeResult }> {
  const parse = await readBackupFile(file)
  if (!parse.ok) return { parse }
  const merge = mergeImported(parse.trips, mode)
  return { parse, merge }
}
