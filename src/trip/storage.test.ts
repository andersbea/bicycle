import { describe, it, expect, beforeEach } from "vitest"
import {
  validateTrip,
  loadTrips,
  upsertTrip,
  deleteTrip,
  getTrip,
  clearAllTrips,
  saveActiveTrip,
  loadActiveTrip,
  mergeImported,
  TRIPS_KEY,
} from "./storage"
import type { Trip } from "./types"

function trip(id: string, startedAt: number): Trip {
  return {
    id,
    title: "Ride " + id,
    startedAt,
    endedAt: startedAt + 1000,
    points: [{ t: startedAt, lat: 57.7, lng: 11.97 }],
    weather: [],
    status: "finished",
    pausedMs: 0,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe("validateTrip", () => {
  it("accepts a well-formed trip", () => {
    expect(validateTrip(trip("a", 1))).not.toBeNull()
  })
  it("rejects non-objects and wrong shapes", () => {
    expect(validateTrip(null)).toBeNull()
    expect(validateTrip({ id: "x" })).toBeNull()
    expect(validateTrip({ id: "x", startedAt: 1, points: [], status: "bogus" })).toBeNull()
  })
  it("drops malformed track points but keeps the trip", () => {
    const v = validateTrip({
      id: "a",
      startedAt: 1,
      status: "finished",
      points: [{ t: 1, lat: 1, lng: 2 }, { lat: "x" }, 42],
    })
    expect(v).not.toBeNull()
    expect(v!.points.length).toBe(1)
  })
  it("defaults a missing title and pausedMs", () => {
    const v = validateTrip({ id: "a", startedAt: 1, status: "finished", points: [] })
    expect(v!.title).toBe("Ride")
    expect(v!.pausedMs).toBe(0)
  })
})

describe("loadTrips", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadTrips()).toEqual([])
  })
  it("ignores corrupt JSON", () => {
    localStorage.setItem(TRIPS_KEY, "{not json")
    expect(loadTrips()).toEqual([])
  })
})

describe("upsert / get / delete", () => {
  it("inserts and keeps the list newest-first", () => {
    upsertTrip(trip("old", 1000))
    upsertTrip(trip("new", 5000))
    const all = loadTrips()
    expect(all.map((t) => t.id)).toEqual(["new", "old"])
  })
  it("replaces an existing trip by id rather than duplicating", () => {
    upsertTrip(trip("a", 1000))
    const updated = { ...trip("a", 1000), title: "Renamed" }
    upsertTrip(updated)
    expect(loadTrips().length).toBe(1)
    expect(getTrip("a")?.title).toBe("Renamed")
  })
  it("deletes by id", () => {
    upsertTrip(trip("a", 1))
    upsertTrip(trip("b", 2))
    deleteTrip("a")
    expect(loadTrips().map((t) => t.id)).toEqual(["b"])
  })
})

describe("active trip slot", () => {
  it("round-trips and clears with null", () => {
    saveActiveTrip(trip("active", 1))
    expect(loadActiveTrip()?.id).toBe("active")
    saveActiveTrip(null)
    expect(loadActiveTrip()).toBeNull()
  })
})

describe("clearAllTrips", () => {
  it("removes both the history and active slots", () => {
    upsertTrip(trip("a", 1))
    saveActiveTrip(trip("active", 2))
    clearAllTrips()
    expect(loadTrips()).toEqual([])
    expect(loadActiveTrip()).toBeNull()
  })
})

describe("mergeImported", () => {
  it("merge keeps existing rides and only adds new ids", () => {
    upsertTrip(trip("a", 1000))
    const res = mergeImported([trip("a", 9999), trip("b", 2000)], "merge")
    expect(res.added).toBe(1)
    expect(res.total).toBe(2)
    // existing 'a' is preserved (its original startedAt), not overwritten
    expect(getTrip("a")?.startedAt).toBe(1000)
  })
  it("replace overwrites the entire history", () => {
    upsertTrip(trip("a", 1000))
    const res = mergeImported([trip("x", 1), trip("y", 2)], "replace")
    expect(res.total).toBe(2)
    expect(loadTrips().map((t) => t.id).sort()).toEqual(["x", "y"])
  })
})
