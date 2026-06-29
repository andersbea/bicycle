import { describe, it, expect } from "vitest"
import { buildBackup, tripToCsv, tripToGpx } from "./export"
import { SCHEMA_VERSION } from "./storage"
import type { Trip } from "./types"

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "a",
    title: "Morning ride",
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_030_000,
    points: [
      { t: 1_700_000_000_000, lat: 57.7, lng: 11.97, alt: 12.3, speed: 5.5, accuracy: 5 },
      { t: 1_700_000_010_000, lat: 57.701, lng: 11.971, alt: 15.1, speed: 6.2, accuracy: 5 },
    ],
    weather: [],
    status: "finished",
    pausedMs: 0,
    ...overrides,
  }
}

describe("buildBackup", () => {
  it("wraps trips with app metadata and schema version", () => {
    const b = buildBackup([trip()])
    expect(b.app).toBe("bicycle")
    expect(b.schemaVersion).toBe(SCHEMA_VERSION)
    expect(b.trips.length).toBe(1)
    expect(typeof b.exportedAt).toBe("string")
  })
})

describe("tripToCsv", () => {
  it("emits a header plus one row per point", () => {
    const csv = tripToCsv(trip())
    const lines = csv.split("\n")
    expect(lines[0]).toContain("timestamp,latitude,longitude")
    expect(lines.length).toBe(3) // header + 2 points
    expect(lines[1]).toContain("57.7")
  })
})

describe("tripToGpx", () => {
  it("produces a valid-looking GPX 1.1 document", () => {
    const gpx = tripToGpx(trip())
    expect(gpx).toContain('<gpx version="1.1"')
    expect(gpx).toContain("<trkpt")
    expect(gpx).toContain("<ele>12.3</ele>")
    expect(gpx).toContain("<time>")
    expect((gpx.match(/<trkpt/g) ?? []).length).toBe(2)
  })

  it("XML-escapes the ride title", () => {
    const gpx = tripToGpx(trip({ title: "Ride <A> & B" }))
    expect(gpx).toContain("Ride &lt;A&gt; &amp; B")
    expect(gpx).not.toContain("Ride <A> & B")
  })
})
