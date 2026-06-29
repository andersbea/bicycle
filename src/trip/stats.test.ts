import { describe, it, expect } from "vitest"
import {
  haversine,
  cumulativeDistance,
  speeds,
  smoothedAltitudes,
  computeStats,
  projectRoute,
  elevationProfile,
} from "./stats"
import type { TrackPoint, Trip } from "./types"

function pt(
  t: number,
  lat: number,
  lng: number,
  alt: number | null = null,
  speed: number | null = null,
): TrackPoint {
  return { t, lat, lng, alt, speed, accuracy: 5 }
}

function trip(points: TrackPoint[]): Trip {
  return {
    id: "t1",
    title: "Test ride",
    startedAt: points[0]?.t ?? 0,
    endedAt: points[points.length - 1]?.t ?? 0,
    points,
    weather: [],
    status: "finished",
    pausedMs: 0,
  }
}

describe("haversine", () => {
  it("is zero for identical coordinates", () => {
    expect(haversine(57.7, 11.97, 57.7, 11.97)).toBe(0)
  })
  it("matches ~111 km for one degree of latitude", () => {
    const d = haversine(0, 0, 1, 0)
    expect(d).toBeGreaterThan(111_000)
    expect(d).toBeLessThan(111_400)
  })
  it("is symmetric", () => {
    const a = haversine(57.7, 11.9, 57.71, 11.92)
    const b = haversine(57.71, 11.92, 57.7, 11.9)
    expect(a).toBeCloseTo(b, 6)
  })
})

describe("cumulativeDistance", () => {
  it("is monotonically non-decreasing and starts at 0", () => {
    const pts = [pt(0, 57.70, 11.97), pt(1000, 57.701, 11.971), pt(2000, 57.702, 11.972)]
    const cum = cumulativeDistance(pts)
    expect(cum[0]).toBe(0)
    expect(cum[1]).toBeGreaterThan(0)
    expect(cum[2]).toBeGreaterThan(cum[1])
  })
})

describe("speeds", () => {
  it("uses GPS speed when present", () => {
    const pts = [pt(0, 0, 0, null, 4), pt(1000, 0.0001, 0, null, 8)]
    expect(speeds(pts)[1]).toBe(8)
  })
  it("derives speed from distance/time when GPS speed is absent", () => {
    // ~111 m north over 10 s → ~11.1 m/s
    const pts = [pt(0, 0, 0), pt(10_000, 0.001, 0)]
    const s = speeds(pts)[1]
    expect(s).toBeGreaterThan(10)
    expect(s).toBeLessThan(12)
  })

  it("rejects implausible GPS speed spikes (> ~80 km/h)", () => {
    const pts = [pt(0, 0, 0, null, 5), pt(1000, 0.00001, 0, null, 300)]
    expect(speeds(pts)[1]).toBeLessThan(80 / 3.6)
  })
})

describe("smoothedAltitudes", () => {
  it("returns null when no point carries altitude", () => {
    expect(smoothedAltitudes([pt(0, 0, 0), pt(1, 0, 0)])).toBeNull()
  })
  it("returns a same-length series when altitudes exist", () => {
    const pts = [pt(0, 0, 0, 10), pt(1, 0, 0, 20), pt(2, 0, 0, 30)]
    const alts = smoothedAltitudes(pts)
    expect(alts).not.toBeNull()
    expect(alts!.length).toBe(3)
  })
})

describe("computeStats", () => {
  it("returns an all-zero result for an empty ride", () => {
    const s = computeStats(trip([]))
    expect(s.distanceM).toBe(0)
    expect(s.pointCount).toBe(0)
    expect(s.minAlt).toBeNull()
  })

  it("accumulates distance and duration", () => {
    const pts = [
      pt(0, 57.70, 11.97, 10, 6),
      pt(10_000, 57.701, 11.971, 12, 6),
      pt(20_000, 57.702, 11.972, 14, 6),
    ]
    const s = computeStats(trip(pts))
    expect(s.distanceM).toBeGreaterThan(0)
    expect(s.durationMs).toBe(20_000)
    expect(s.maxSpeed).toBe(6)
  })

  it("counts a pure climb as ascent with no descent", () => {
    const pts = [
      pt(0, 0, 0, 0),
      pt(10_000, 0.001, 0, 10),
      pt(20_000, 0.002, 0, 20),
      pt(30_000, 0.003, 0, 30),
      pt(40_000, 0.004, 0, 40),
    ]
    const s = computeStats(trip(pts))
    expect(s.ascentM).toBeGreaterThan(0)
    expect(s.descentM).toBe(0)
    expect(s.maxGrade).toBeGreaterThan(0)
    // Altitude is median-smoothed, so endpoints shift; just assert a real range.
    expect(s.minAlt).not.toBeNull()
    expect(s.maxAlt!).toBeGreaterThan(s.minAlt!)
  })

  it("counts a pure descent as descent with no ascent", () => {
    const pts = [
      pt(0, 0, 0, 40),
      pt(10_000, 0.001, 0, 30),
      pt(20_000, 0.002, 0, 20),
      pt(30_000, 0.003, 0, 10),
      pt(40_000, 0.004, 0, 0),
    ]
    const s = computeStats(trip(pts))
    expect(s.descentM).toBeGreaterThan(0)
    expect(s.ascentM).toBe(0)
  })

  it("keeps the average sane across a GPS dropout (regression)", () => {
    // Walking fixes ~9 m / 10 s apart (≈0.9 m/s), then a 5-minute signal gap
    // with a ~480 m straight-line jump, then more walking. Speed is derived
    // from positions (no GPS speed field). The gap segment must be excluded
    // from the moving average rather than inflating it.
    const pts = [
      pt(0, 57.70000, 11.97),
      pt(10_000, 57.70008, 11.97),
      pt(20_000, 57.70016, 11.97),
      pt(320_000, 57.70450, 11.97), // 5-min gap + ~480 m jump
      pt(330_000, 57.70458, 11.97),
    ]
    const s = computeStats(trip(pts))
    expect(s.avgSpeed).toBeLessThan(5) // m/s — i.e. not tens/hundreds of km/h
    expect(s.avgSpeed).toBeLessThanOrEqual(s.maxSpeed + 0.01)
  })

  it("subtracts paused time from the duration", () => {
    const pts = [pt(0, 0, 0), pt(60_000, 0.001, 0)]
    const base = trip(pts)
    const s = computeStats({ ...base, pausedMs: 20_000 })
    expect(s.durationMs).toBe(40_000)
  })
})

describe("projectRoute", () => {
  it("maps points inside the box and normalises speed to [0,1]", () => {
    const pts = [
      pt(0, 57.70, 11.97, null, 2),
      pt(1000, 57.71, 11.98, null, 6),
      pt(2000, 57.72, 11.99, null, 10),
    ]
    const { pts: screen, speedT } = projectRoute(pts, 100, 60)
    expect(screen.length).toBe(3)
    for (const p of screen) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(100)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(60)
    }
    expect(Math.max(...speedT)).toBeLessThanOrEqual(1)
    expect(Math.min(...speedT)).toBeGreaterThanOrEqual(0)
  })
  it("returns empty arrays for no points", () => {
    expect(projectRoute([], 100, 100)).toEqual({ pts: [], speedT: [] })
  })
})

describe("elevationProfile", () => {
  it("returns one {d,alt} pair per point with increasing distance", () => {
    const pts = [pt(0, 0, 0, 10), pt(1000, 0.001, 0, 20), pt(2000, 0.002, 0, 30)]
    const prof = elevationProfile(pts)
    expect(prof.length).toBe(3)
    expect(prof[0].d).toBe(0)
    expect(prof[2].d).toBeGreaterThan(prof[1].d)
  })
  it("is empty without altitude data", () => {
    expect(elevationProfile([pt(0, 0, 0), pt(1, 0, 0)])).toEqual([])
  })
})
