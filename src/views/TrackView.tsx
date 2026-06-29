import { useMemo, useState } from "react"
import {
  Play,
  Pause,
  Square,
  Gauge,
  Route,
  Timer,
  TrendingUp,
  TrendingDown,
  MountainSnow,
  Satellite,
  AlertTriangle,
} from "lucide-react"
import type { Tracker } from "@/hooks/useTripTracker"
import { speeds } from "@/trip/stats"
import { kmh, distance, duration, metres } from "@/trip/format"
import { StatTile } from "@/components/StatTile"
import { WeatherBadge } from "@/components/WeatherBadge"
import { RouteMap } from "@/components/RouteMap"

export function TrackView({ tracker }: { tracker: Tracker }) {
  const { activeTrip, isActive, isRecording, isPaused, stats, geoError, acquiring, lastPoint } =
    tracker
  const [confirmStop, setConfirmStop] = useState(false)

  const currentSpeed = useMemo(() => {
    if (!activeTrip || activeTrip.points.length < 2) return 0
    if (isPaused) return 0
    const s = speeds(activeTrip.points)
    return s[s.length - 1] ?? 0
  }, [activeTrip, isPaused])

  const latestWeather = activeTrip?.weather[activeTrip.weather.length - 1]

  if (!isActive) {
    return <IdleScreen onStart={tracker.start} geoError={geoError} />
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto no-scrollbar px-4 pb-2 lg:px-8">
      {/* status row */}
      <div className="flex items-center justify-between">
        <span
          className={`badge gap-1.5 ${isPaused ? "badge-warning" : "badge-success"} badge-outline`}
        >
          {!isPaused && <span className="relative flex h-2 w-2">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-success" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>}
          {isPaused ? "Paused" : "Recording"}
        </span>
        <span className="flex items-center gap-1 text-xs opacity-60">
          <Satellite className="h-3.5 w-3.5" />
          {acquiring
            ? "Acquiring…"
            : lastPoint?.accuracy != null
              ? `±${Math.round(lastPoint.accuracy)} m`
              : "—"}
        </span>
      </div>

      {geoError && (
        <div className="alert alert-warning py-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{geoError.message}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        {/* left: hero speed + weather */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center justify-center rounded-box bg-base-200/40 py-6 ring-1 ring-base-content/5 lg:py-14">
            <div className="tnum text-7xl font-bold leading-none text-primary lg:text-8xl">
              {kmh(currentSpeed)}
            </div>
            <div className="mt-1 text-sm uppercase tracking-widest opacity-50">km/h</div>
          </div>

          {latestWeather ? (
            <WeatherBadge w={latestWeather} />
          ) : (
            <div className="rounded-box bg-base-200/40 px-3 py-2 text-xs opacity-50">
              <MountainSnow className="mr-1 inline h-3.5 w-3.5" />
              Fetching weather…
            </div>
          )}
        </div>

        {/* right: stat grid + route map */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <StatTile icon={Route} label="Distance" value={distance(stats.distanceM)} accent="primary" />
            <StatTile icon={Timer} label="Duration" value={duration(stats.durationMs)} />
            <StatTile icon={Gauge} label="Avg speed" value={kmh(stats.avgSpeed)} unit="km/h" />
            <StatTile icon={Gauge} label="Max speed" value={kmh(stats.maxSpeed)} unit="km/h" accent="secondary" />
            <StatTile icon={TrendingUp} label="Ascent" value={metres(stats.ascentM)} accent="accent" />
            <StatTile icon={TrendingDown} label="Descent" value={metres(stats.descentM)} />
          </div>

          <RouteMap points={activeTrip?.points ?? []} className="h-44 w-full lg:h-64" />
        </div>
      </div>

      {/* controls */}
      <div className="sticky bottom-0 mt-auto flex gap-2 bg-gradient-to-t from-base-100 to-transparent pt-3 safe-bottom">
        {isRecording ? (
          <button className="btn btn-warning flex-1" onClick={tracker.pause}>
            <Pause className="h-5 w-5" /> Pause
          </button>
        ) : (
          <button className="btn btn-success flex-1" onClick={tracker.resume}>
            <Play className="h-5 w-5" /> Resume
          </button>
        )}
        <button className="btn btn-error btn-outline flex-1" onClick={() => setConfirmStop(true)}>
          <Square className="h-5 w-5" /> Finish
        </button>
      </div>

      {confirmStop && (
        <div className="modal modal-open" role="dialog">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Finish this ride?</h3>
            <p className="py-2 text-sm opacity-70">
              {distance(stats.distanceM)} · {duration(stats.durationMs)}. It'll be saved to your history.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setConfirmStop(false)}>
                Keep riding
              </button>
              <button
                className="btn btn-error"
                onClick={() => {
                  setConfirmStop(false)
                  tracker.stop()
                }}
              >
                Finish & save
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setConfirmStop(false)} />
        </div>
      )}
    </div>
  )
}

function IdleScreen({
  onStart,
  geoError,
}: {
  onStart: () => void
  geoError: Tracker["geoError"]
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-20 w-20 rounded-2xl" />
        <h1 className="text-2xl font-bold">Ready to ride</h1>
        <p className="max-w-xs text-sm opacity-60">
          Tap start and Bicycle will track your speed, route, climbing and the weather — all stored on
          your device.
        </p>
      </div>
      <button className="btn btn-primary btn-lg gap-2 px-10" onClick={onStart}>
        <Play className="h-6 w-6" /> Start ride
      </button>
      {geoError && (
        <p className="max-w-xs text-xs text-warning">
          {geoError.message} — allow location access to track a ride.
        </p>
      )}
    </div>
  )
}
