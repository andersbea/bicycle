import { useMemo, useState } from "react"
import {
  TrendingUp,
  Route,
  Gauge,
  Mountain,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  LineChart,
} from "lucide-react"
import type { Trip, TripStats } from "@/trip/types"
import { computeStats } from "@/trip/stats"
import { km, kmh, metres, rideDate, distance, durationShort } from "@/trip/format"

type MetricKey = "distance" | "avgSpeed" | "ascent"

const METRICS: Record<
  MetricKey,
  { label: string; icon: typeof Route; get: (s: TripStats) => number; fmt: (v: number) => string; color: string }
> = {
  distance: {
    label: "Distance",
    icon: Route,
    get: (s) => s.distanceM / 1000,
    fmt: (v) => `${v.toFixed(1)} km`,
    color: "var(--color-primary)",
  },
  avgSpeed: {
    label: "Avg speed",
    icon: Gauge,
    get: (s) => s.avgSpeed * 3.6,
    fmt: (v) => `${v.toFixed(1)} km/h`,
    color: "var(--color-secondary)",
  },
  ascent: {
    label: "Climbing",
    icon: Mountain,
    get: (s) => s.ascentM,
    fmt: (v) => `${Math.round(v)} m`,
    color: "var(--color-accent)",
  },
}

interface Row {
  trip: Trip
  stats: TripStats
}

export function TrendsView({ trips, onOpen }: { trips: Trip[]; onOpen: (t: Trip) => void }) {
  const [metric, setMetric] = useState<MetricKey>("distance")

  const rows: Row[] = useMemo(
    () => trips.map((trip) => ({ trip, stats: computeStats(trip) })),
    [trips],
  )

  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <LineChart className="h-12 w-12 opacity-30" />
        <p className="text-lg font-semibold">No data yet</p>
        <p className="max-w-xs text-sm opacity-60">
          Record a few rides and this page will chart your trends and personal bests.
        </p>
      </div>
    )
  }

  const m = METRICS[metric]
  // Chronological for the chart (oldest → newest), capped to the last 24 rides.
  const chrono = [...rows].sort((a, b) => a.trip.startedAt - b.trip.startedAt).slice(-24)
  const values = chrono.map((r) => m.get(r.stats))
  const maxVal = Math.max(...values, 0.0001)
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length

  // Personal bests.
  const best = {
    distance: rows.reduce((a, b) => (b.stats.distanceM > a.stats.distanceM ? b : a)),
    speed: rows.reduce((a, b) => (b.stats.maxSpeed > a.stats.maxSpeed ? b : a)),
    ascent: rows.reduce((a, b) => (b.stats.ascentM > a.stats.ascentM ? b : a)),
    duration: rows.reduce((a, b) => (b.stats.durationMs > a.stats.durationMs ? b : a)),
  }

  // Latest ride vs all-time average.
  const latest = rows.reduce((a, b) => (b.trip.startedAt > a.trip.startedAt ? b : a))
  const avg = {
    distanceM: rows.reduce((s, r) => s + r.stats.distanceM, 0) / rows.length,
    avgSpeed: rows.reduce((s, r) => s + r.stats.avgSpeed, 0) / rows.length,
    ascentM: rows.reduce((s, r) => s + r.stats.ascentM, 0) / rows.length,
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto no-scrollbar px-4 pb-6 lg:px-8">
      {/* metric switcher */}
      <div role="tablist" className="tabs tabs-box tabs-sm self-start">
        {(Object.keys(METRICS) as MetricKey[]).map((key) => {
          const Icon = METRICS[key].icon
          return (
            <button
              key={key}
              role="tab"
              className={`tab gap-1 ${metric === key ? "tab-active" : ""}`}
              onClick={() => setMetric(key)}
            >
              <Icon className="h-3.5 w-3.5" /> {METRICS[key].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
      {/* bar chart */}
      <div className="rounded-box bg-base-200/50 p-3 ring-1 ring-base-content/5 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between text-xs opacity-60">
          <span>Last {chrono.length} rides</span>
          <span className="tnum">avg {m.fmt(avgVal)}</span>
        </div>
        <div className="relative flex h-40 items-end gap-1 lg:h-64">
          {/* average line */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-base-content/30"
            style={{ bottom: `${(avgVal / maxVal) * 100}%` }}
          />
          {chrono.map((r, i) => (
            <button
              key={r.trip.id}
              onClick={() => onOpen(r.trip)}
              className="group flex h-full flex-1 flex-col justify-end"
              title={`${rideDate(r.trip.startedAt)} · ${m.fmt(values[i])}`}
            >
              <div
                className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                style={{
                  height: `${Math.max(2, (values[i] / maxVal) * 100)}%`,
                  backgroundColor: m.color,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* latest vs average */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-60">
          <TrendingUp className="h-3.5 w-3.5" /> Latest ride vs your average
        </div>
        <button
          onClick={() => onOpen(latest.trip)}
          className="grid w-full grid-cols-3 gap-2 rounded-box bg-base-200/50 p-3 text-left ring-1 ring-base-content/5 hover:bg-base-200"
        >
          <Delta label="Distance" value={distance(latest.stats.distanceM)} cur={latest.stats.distanceM} avg={avg.distanceM} />
          <Delta label="Avg speed" value={`${kmh(latest.stats.avgSpeed)} km/h`} cur={latest.stats.avgSpeed} avg={avg.avgSpeed} />
          <Delta label="Climbing" value={metres(latest.stats.ascentM)} cur={latest.stats.ascentM} avg={avg.ascentM} />
        </button>
      </div>
      </div>

      {/* personal bests */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-60">
          <Trophy className="h-3.5 w-3.5 text-warning" /> Personal bests
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <BestCard label="Longest ride" value={distance(best.distance.stats.distanceM)} sub={rideDate(best.distance.trip.startedAt)} onClick={() => onOpen(best.distance.trip)} />
          <BestCard label="Top speed" value={`${kmh(best.speed.stats.maxSpeed)} km/h`} sub={rideDate(best.speed.trip.startedAt)} onClick={() => onOpen(best.speed.trip)} />
          <BestCard label="Most climbing" value={metres(best.ascent.stats.ascentM)} sub={rideDate(best.ascent.trip.startedAt)} onClick={() => onOpen(best.ascent.trip)} />
          <BestCard label="Longest time" value={durationShort(best.duration.stats.durationMs)} sub={rideDate(best.duration.trip.startedAt)} onClick={() => onOpen(best.duration.trip)} />
        </div>
      </div>

      <p className="px-1 text-center text-[0.7rem] opacity-40">
        {km(rows.reduce((s, r) => s + r.stats.distanceM, 0), 0)} km across {rows.length} rides
      </p>
    </div>
  )
}

function Delta({ label, value, cur, avg }: { label: string; value: string; cur: number; avg: number }) {
  const pct = avg > 0 ? (cur - avg) / avg : 0
  const up = pct > 0.02
  const down = pct < -0.02
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus
  const color = up ? "text-success" : down ? "text-error" : "opacity-50"
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-wide opacity-50">{label}</div>
      <div className="tnum font-semibold leading-tight">{value}</div>
      <div className={`flex items-center gap-0.5 text-xs ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="tnum">{Math.abs(pct * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

function BestCard({ label, value, sub, onClick }: { label: string; value: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-box bg-base-200/50 p-3 text-left ring-1 ring-base-content/5 hover:bg-base-200"
    >
      <div className="text-[0.65rem] uppercase tracking-wide opacity-50">{label}</div>
      <div className="tnum text-lg font-bold leading-tight">{value}</div>
      <div className="text-xs opacity-50">{sub}</div>
    </button>
  )
}
