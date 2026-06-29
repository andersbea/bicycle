/**
 * Core domain model. Everything here is plain JSON-serialisable data so it can
 * round-trip through localStorage and the backup-export file unchanged.
 */

/** A single GPS sample recorded while tracking. */
export interface TrackPoint {
  /** Epoch milliseconds. */
  t: number
  lat: number
  lng: number
  /** Altitude in metres, when the device reports it. */
  alt?: number | null
  /** Instantaneous speed in m/s as reported by the GPS, when available. */
  speed?: number | null
  /** Horizontal accuracy in metres. */
  accuracy?: number | null
  /** Heading in degrees from true north, when moving. */
  heading?: number | null
}

/** A weather reading captured at a point in time during the ride. */
export interface WeatherSnapshot {
  t: number
  tempC: number
  apparentC: number
  /** WMO weather interpretation code. */
  code: number
  condition: string
  windKph: number
  windDir: number
  humidity: number
}

export type TripStatus = "recording" | "paused" | "finished"

/** A recorded ride. */
export interface Trip {
  id: string
  title: string
  /** Epoch ms when tracking started. */
  startedAt: number
  /** Epoch ms when tracking stopped (undefined while still active). */
  endedAt?: number
  points: TrackPoint[]
  weather: WeatherSnapshot[]
  status: TripStatus
  /** Total milliseconds spent paused, subtracted from elapsed time. */
  pausedMs: number
  /** Free-text note the rider can add afterwards. */
  note?: string
}

/** Derived, never-persisted statistics computed from a Trip's points. */
export interface TripStats {
  /** Total distance in metres. */
  distanceM: number
  /** Elapsed wall-clock duration in ms (end - start - paused). */
  durationMs: number
  /** Time spent actually moving, in ms. */
  movingMs: number
  /** Average speed over moving time, m/s. */
  avgSpeed: number
  /** Average speed over total duration, m/s. */
  avgSpeedOverall: number
  /** Peak speed, m/s. */
  maxSpeed: number
  /** Total metres climbed. */
  ascentM: number
  /** Total metres descended. */
  descentM: number
  /** Steepest sustained grade as a fraction (0.08 = 8%). */
  maxGrade: number
  /** Min / max altitude in metres (null when no altitude data). */
  minAlt: number | null
  maxAlt: number | null
  /** Number of recorded points. */
  pointCount: number
}
