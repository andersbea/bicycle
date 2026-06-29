import { useMemo, useState } from "react"
import {
  ArrowLeft,
  Trash2,
  Route,
  Timer,
  Gauge,
  TrendingUp,
  TrendingDown,
  MountainSnow,
  Percent,
  FileJson,
  FileText,
  MapPin,
} from "lucide-react"
import type { Trip } from "@/trip/types"
import { computeStats, elevationProfile } from "@/trip/stats"
import { distance, duration, kmh, metres, percent, rideDate, rideTime } from "@/trip/format"
import { downloadTripJson, downloadTripCsv, downloadTripGpx } from "@/trip/export"
import { weatherIcon } from "@/trip/weather"
import { StatTile } from "@/components/StatTile"
import { WeatherBadge } from "@/components/WeatherBadge"
import { TripMap } from "@/components/TripMap"
import { Sparkline } from "@/components/Sparkline"

export function TripDetail({
  trip,
  onBack,
  onDelete,
}: {
  trip: Trip
  onBack: () => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const stats = useMemo(() => computeStats(trip), [trip])
  const profile = useMemo(
    () => elevationProfile(trip.points).map((p) => ({ x: p.d, y: p.alt })),
    [trip],
  )

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2 safe-top">
        <button className="btn btn-ghost btn-sm btn-circle" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{trip.title}</div>
          <div className="text-xs opacity-50">
            {rideDate(trip.startedAt)} · {rideTime(trip.startedAt)}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-circle text-error"
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete ride"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto w-full max-w-4xl px-4 pb-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
            {/* left: route + elevation */}
            <div className="flex flex-col gap-3">
              <TripMap points={trip.points} className="h-56 w-full lg:h-96" />
              {profile.length > 1 && (
                <div className="rounded-box bg-base-200/50 p-3 ring-1 ring-base-content/5">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-60">
                    <MountainSnow className="h-3.5 w-3.5 text-accent" /> Elevation profile
                  </div>
                  <Sparkline data={profile} className="h-28 lg:h-36" stroke="var(--color-accent)" />
                </div>
              )}
            </div>

            {/* right: stats + weather + export */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon={Route} label="Distance" value={distance(stats.distanceM)} accent="primary" />
                <StatTile icon={Timer} label="Duration" value={duration(stats.durationMs)} />
                <StatTile icon={Timer} label="Moving" value={duration(stats.movingMs)} />
                <StatTile icon={Gauge} label="Avg" value={kmh(stats.avgSpeed)} unit="km/h" />
                <StatTile icon={Gauge} label="Max" value={kmh(stats.maxSpeed)} unit="km/h" accent="secondary" />
                <StatTile icon={Percent} label="Max grade" value={percent(stats.maxGrade)} />
                <StatTile icon={TrendingUp} label="Ascent" value={metres(stats.ascentM)} accent="accent" />
                <StatTile icon={TrendingDown} label="Descent" value={metres(stats.descentM)} />
                <StatTile
                  icon={MountainSnow}
                  label="Peak alt"
                  value={stats.maxAlt != null ? metres(stats.maxAlt) : "—"}
                />
              </div>

              {/* weather timeline */}
              {trip.weather.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-60">Weather</div>
                  {trip.weather.length === 1 ? (
                    <WeatherBadge w={trip.weather[0]} />
                  ) : (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {trip.weather.map((w, i) => (
                        <div
                          key={i}
                          className="flex shrink-0 flex-col items-center rounded-box bg-base-200/60 px-3 py-2 ring-1 ring-base-content/5"
                        >
                          <span className="text-xs opacity-50">{rideTime(w.t)}</span>
                          <span className="text-xl">{weatherIcon(w.code)}</span>
                          <span className="tnum text-sm font-semibold">{Math.round(w.tempC)}°</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* export */}
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium uppercase tracking-wide opacity-60">Export this ride</div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => downloadTripJson(trip)}>
                    <FileJson className="h-4 w-4" /> JSON
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadTripCsv(trip)}>
                    <FileText className="h-4 w-4" /> CSV
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadTripGpx(trip)}>
                    <MapPin className="h-4 w-4" /> GPX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="modal modal-open" role="dialog">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Delete this ride?</h3>
            <p className="py-2 text-sm opacity-70">This can't be undone.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => {
                  setConfirmDelete(false)
                  onDelete(trip.id)
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setConfirmDelete(false)} />
        </div>
      )}
    </div>
  )
}
