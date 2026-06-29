import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { GeoError } from "@/trip/geolocation"
import { watch } from "@/trip/geolocation"
import { fetchWeather } from "@/trip/weather"
import { computeStats } from "@/trip/stats"
import { loadActiveTrip, saveActiveTrip, upsertTrip } from "@/trip/storage"
import type { Trip, TrackPoint } from "@/trip/types"
import { uid } from "@/lib/utils"

const AUTOSAVE_INTERVAL_MS = 5_000
const WEATHER_INTERVAL_MS = 5 * 60_000
/** Drop fixes worse than this (metres) — they wreck distance/elevation totals. */
const ACCURACY_GATE_M = 50

export interface Tracker {
  activeTrip: Trip | null
  isActive: boolean
  isRecording: boolean
  isPaused: boolean
  /** Live stats, with duration ticking against the wall clock. */
  stats: ReturnType<typeof computeStats>
  geoError: GeoError | null
  acquiring: boolean
  lastPoint: TrackPoint | null
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => Trip | null
  discard: () => void
}

export interface TrackerOptions {
  onFinish?: (t: Trip) => void
  /** When false, no weather is fetched during the ride. */
  weatherEnabled?: boolean
}

export function useTripTracker(opts: TrackerOptions = {}): Tracker {
  const { onFinish, weatherEnabled = true } = opts

  // The active trip is React state — the single source of truth for rendering.
  const [trip, setTrip] = useState<Trip | null>(() => loadActiveTrip())
  // Wall-clock tick so the duration display advances without new GPS fixes.
  const [now, setNow] = useState(() => Date.now())
  // Epoch ms when the current pause began (null when not paused).
  const [pausedAt, setPausedAt] = useState<number | null>(() =>
    loadActiveTrip()?.status === "paused" ? Date.now() : null,
  )
  const [geoError, setGeoError] = useState<GeoError | null>(null)

  // Mirror of `trip` for reading inside intervals/callbacks (never in render).
  const tripRef = useRef(trip)
  useEffect(() => {
    tripRef.current = trip
  }, [trip])

  const lastSaveRef = useRef(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const status = trip?.status
  const isActive = !!trip && status !== "finished"
  const isRecording = status === "recording"
  const isPaused = status === "paused"
  const lastPoint = trip?.points[trip.points.length - 1] ?? null
  const acquiring = isActive && (trip?.points.length ?? 0) === 0 && !geoError

  // ---- Wake lock: keep the screen on while recording -----------------------
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen")
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null
        })
      }
    } catch {
      // Permission denied or not supported — non-fatal.
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }, [])

  // ---- Geolocation watch + ticker, active whenever a trip is live ----------
  useEffect(() => {
    if (!isActive) return

    requestWakeLock()
    const reacquire = () => {
      if (document.visibilityState === "visible") requestWakeLock()
    }
    document.addEventListener("visibilitychange", reacquire)

    const stopWatch = watch({
      onPoint: (p) => {
        setGeoError(null)
        // Reject low-accuracy fixes outright.
        if (typeof p.accuracy === "number" && p.accuracy > ACCURACY_GATE_M) return
        setTrip((prev) => {
          if (!prev || prev.status !== "recording") return prev // ignore while paused
          return { ...prev, points: [...prev.points, p] }
        })
      },
      onError: (e) => setGeoError(e),
    })

    const ticker = window.setInterval(() => setNow(Date.now()), 1000)

    return () => {
      stopWatch()
      window.clearInterval(ticker)
      document.removeEventListener("visibilitychange", reacquire)
      releaseWakeLock()
    }
  }, [isActive, requestWakeLock, releaseWakeLock])

  // ---- Throttled autosave of the active trip (crash recovery) --------------
  useEffect(() => {
    if (!trip || trip.status === "finished") return
    const elapsed = Date.now() - lastSaveRef.current
    if (elapsed >= AUTOSAVE_INTERVAL_MS) {
      lastSaveRef.current = Date.now()
      saveActiveTrip(trip)
      return
    }
    // Trailing edge: ensure the latest state lands within the interval.
    const id = window.setTimeout(() => {
      lastSaveRef.current = Date.now()
      saveActiveTrip(trip)
    }, AUTOSAVE_INTERVAL_MS - elapsed)
    return () => window.clearTimeout(id)
  }, [trip])

  // ---- Weather polling -----------------------------------------------------
  useEffect(() => {
    if (!isRecording || !weatherEnabled) return
    let cancelled = false
    const poll = async () => {
      const t = tripRef.current
      const last = t?.points[t.points.length - 1]
      if (!t || !last) return
      const w = await fetchWeather(last.lat, last.lng)
      if (cancelled || !w) return
      setTrip((prev) => (prev ? { ...prev, weather: [...prev.weather, w] } : prev))
    }
    const first = window.setTimeout(poll, 4_000)
    const interval = window.setInterval(poll, WEATHER_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [isRecording, weatherEnabled])

  // ---- Controls ------------------------------------------------------------
  const start = useCallback(() => {
    const t: Trip = {
      id: uid(),
      title: defaultTitle(),
      startedAt: Date.now(),
      points: [],
      weather: [],
      status: "recording",
      pausedMs: 0,
    }
    setGeoError(null)
    setPausedAt(null)
    setNow(Date.now())
    saveActiveTrip(t)
    setTrip(t)
  }, [])

  const pause = useCallback(() => {
    setPausedAt(Date.now())
    setTrip((prev) =>
      prev && prev.status === "recording" ? { ...prev, status: "paused" } : prev,
    )
  }, [])

  const resume = useCallback(() => {
    const pausedFor = pausedAt ? Date.now() - pausedAt : 0
    setPausedAt(null)
    setTrip((prev) =>
      prev && prev.status === "paused"
        ? { ...prev, status: "recording", pausedMs: prev.pausedMs + pausedFor }
        : prev,
    )
  }, [pausedAt])

  const stop = useCallback((): Trip | null => {
    const current = tripRef.current
    if (!current) return null
    const pausedFor =
      current.status === "paused" && pausedAt ? Date.now() - pausedAt : 0
    const finished: Trip = {
      ...current,
      status: "finished",
      endedAt: Date.now(),
      pausedMs: current.pausedMs + pausedFor,
    }
    upsertTrip(finished)
    saveActiveTrip(null)
    setPausedAt(null)
    setTrip(null)
    onFinish?.(finished)
    return finished
  }, [onFinish, pausedAt])

  const discard = useCallback(() => {
    saveActiveTrip(null)
    setPausedAt(null)
    setTrip(null)
  }, [])

  // ---- Live stats ----------------------------------------------------------
  const stats = useMemo(() => {
    if (!trip) {
      return computeStats({
        id: "",
        title: "",
        startedAt: now,
        points: [],
        weather: [],
        status: "finished",
        pausedMs: 0,
      })
    }
    if (trip.status === "finished") return computeStats(trip)
    // Live trip: treat "now" as the end, and fold any in-progress pause into
    // pausedMs so the duration reads correctly while paused.
    const ongoingPause = trip.status === "paused" && pausedAt ? now - pausedAt : 0
    return computeStats({ ...trip, endedAt: now, pausedMs: trip.pausedMs + ongoingPause })
  }, [trip, now, pausedAt])

  return {
    activeTrip: trip,
    isActive,
    isRecording,
    isPaused,
    stats,
    geoError,
    acquiring,
    lastPoint,
    start,
    pause,
    resume,
    stop,
    discard,
  }
}

function defaultTitle(): string {
  const d = new Date()
  const hour = d.getHours()
  const part =
    hour < 6 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
  return `${part} ride`
}
