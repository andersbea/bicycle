import { describe, it, expect } from "vitest"
import { weatherIcon, weatherLabel } from "./weather"

describe("WMO weather code mapping", () => {
  it("labels known codes", () => {
    expect(weatherLabel(0)).toBe("Clear")
    expect(weatherLabel(3)).toBe("Overcast")
    expect(weatherLabel(95)).toBe("Thunderstorm")
  })
  it("falls back gracefully for unknown codes", () => {
    expect(weatherLabel(1234)).toBe("Unknown")
    expect(weatherIcon(1234)).toBe("🌡️")
  })
  it("returns an icon for every labelled code", () => {
    expect(weatherIcon(0)).toBeTruthy()
    expect(weatherIcon(61)).toBeTruthy()
  })
})
