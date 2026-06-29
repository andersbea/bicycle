/**
 * Weather via Open-Meteo — free, no API key, CORS-enabled. Called at ride start
 * and periodically while recording. Any failure (offline, rate limit) just
 * returns null; weather is a nice-to-have, never a blocker.
 */

import type { WeatherSnapshot } from "./types"

/** WMO weather interpretation codes → short human label + emoji. */
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Freezing drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "🌨️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm + hail", icon: "⛈️" },
  99: { label: "Thunderstorm + hail", icon: "⛈️" },
}

export function weatherIcon(code: number): string {
  return WMO[code]?.icon ?? "🌡️"
}

export function weatherLabel(code: number): string {
  return WMO[code]?.label ?? "Unknown"
}

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    apparent_temperature?: number
    weather_code?: number
    wind_speed_10m?: number
    wind_direction_10m?: number
    relative_humidity_2m?: number
  }
}

/**
 * Fetch the current weather for a coordinate. Returns null on any failure.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<WeatherSnapshot | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "relative_humidity_2m",
      ].join(","),
      wind_speed_unit: "kmh",
      timezone: "auto",
    })
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { signal },
    )
    if (!res.ok) return null
    const data = (await res.json()) as OpenMeteoResponse
    const c = data.current
    if (!c || typeof c.temperature_2m !== "number") return null

    const code = c.weather_code ?? 0
    return {
      t: Date.now(),
      tempC: c.temperature_2m,
      apparentC: c.apparent_temperature ?? c.temperature_2m,
      code,
      condition: weatherLabel(code),
      windKph: c.wind_speed_10m ?? 0,
      windDir: c.wind_direction_10m ?? 0,
      humidity: c.relative_humidity_2m ?? 0,
    }
  } catch {
    return null
  }
}
