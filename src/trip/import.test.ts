import { describe, it, expect } from "vitest"
import { parseBackup } from "./import"
import { buildBackup } from "./export"
import type { Trip } from "./types"

function trip(id: string): Trip {
  return {
    id,
    title: "Ride " + id,
    startedAt: 1000,
    endedAt: 2000,
    points: [{ t: 1000, lat: 57.7, lng: 11.97 }],
    weather: [],
    status: "finished",
    pausedMs: 0,
  }
}

describe("parseBackup", () => {
  it("reads a wrapped backup file (the export format)", () => {
    const text = JSON.stringify(buildBackup([trip("a"), trip("b")]))
    const res = parseBackup(text)
    expect(res.ok).toBe(true)
    expect(res.trips.length).toBe(2)
    expect(res.skipped).toBe(0)
  })

  it("accepts a bare array of trips", () => {
    const res = parseBackup(JSON.stringify([trip("a")]))
    expect(res.ok).toBe(true)
    expect(res.trips.length).toBe(1)
  })

  it("rejects invalid JSON", () => {
    const res = parseBackup("{ not json")
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/json/i)
  })

  it("rejects an unrecognised shape", () => {
    const res = parseBackup(JSON.stringify({ hello: "world" }))
    expect(res.ok).toBe(false)
  })

  it("skips corrupt rides but imports the valid ones", () => {
    const text = JSON.stringify({ trips: [trip("a"), { id: "bad" }, 99] })
    const res = parseBackup(text)
    expect(res.ok).toBe(true)
    expect(res.trips.length).toBe(1)
    expect(res.skipped).toBe(2)
  })

  it("fails when no valid rides are present", () => {
    const res = parseBackup(JSON.stringify({ trips: [{ id: "bad" }] }))
    expect(res.ok).toBe(false)
  })
})
