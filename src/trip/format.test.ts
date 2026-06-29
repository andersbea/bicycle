import { describe, it, expect } from "vitest"
import {
  kmh,
  distance,
  km,
  metres,
  temp,
  percent,
  duration,
  durationShort,
  compass,
} from "./format"

describe("kmh", () => {
  it("converts m/s to km/h with one decimal", () => {
    expect(kmh(10)).toBe("36.0")
    expect(kmh(0)).toBe("0.0")
  })
})

describe("distance", () => {
  it("uses metres below 1 km", () => {
    expect(distance(500)).toBe("500 m")
    expect(distance(999)).toBe("999 m")
  })
  it("uses km above 1 km, with adaptive precision", () => {
    expect(distance(1500)).toBe("1.50 km")
    expect(distance(15000)).toBe("15.0 km")
  })
})

describe("km / metres", () => {
  it("formats km with two decimals by default", () => {
    expect(km(12340)).toBe("12.34")
  })
  it("rounds metres with thousands separators", () => {
    expect(metres(1240.6)).toBe("1,241 m")
    expect(metres(52)).toBe("52 m")
  })
})

describe("temp / percent", () => {
  it("rounds temperature with a degree sign", () => {
    expect(temp(18.4)).toBe("18°")
    expect(temp(-2.6)).toBe("-3°")
  })
  it("formats a fraction as a percentage", () => {
    expect(percent(0.082)).toBe("8.2%")
  })
})

describe("duration", () => {
  it("shows h:mm:ss past an hour, m:ss below", () => {
    expect(duration(3_661_000)).toBe("1:01:01")
    expect(duration(83_000)).toBe("1:23")
    expect(duration(0)).toBe("0:00")
  })
  it("clamps negative values to zero", () => {
    expect(duration(-5000)).toBe("0:00")
  })
})

describe("durationShort", () => {
  it("renders compact human durations", () => {
    expect(durationShort(3_660_000)).toBe("1h 1m")
    expect(durationShort(83_000)).toBe("1m")
    expect(durationShort(5_000)).toBe("5s")
  })
})

describe("compass", () => {
  it("maps bearings to 8-point compass directions", () => {
    expect(compass(0)).toBe("N")
    expect(compass(45)).toBe("NE")
    expect(compass(90)).toBe("E")
    expect(compass(225)).toBe("SW")
    expect(compass(360)).toBe("N")
  })
})
