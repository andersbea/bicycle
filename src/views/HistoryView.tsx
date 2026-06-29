import { useMemo } from "react"
import { Bike, Route, Timer, TrendingUp, ChevronRight } from "lucide-react"
import type { Trip } from "@/trip/types"
import { computeStats } from "@/trip/stats"
import { distance, durationShort, kmh, metres, rideDate, rideTime, km } from "@/trip/format"
import { weatherIcon } from "@/trip/weather"
import { RouteMap } from "@/components/RouteMap"

export function HistoryView({
  trips,
  onOpen,
}: {
  trips: Trip[]
  onOpen: (trip: Trip) => void
}) {
  const totals = useMemo(() => {
    let dist = 0
    let dur = 0
    let asc = 0
    for (const t of trips) {
      const s = computeStats(t)
      dist += s.distanceM
      dur += s.durationMs
      asc += s.ascentM
    }
    return { dist, dur, asc, count: trips.length }
  }, [trips])

  if (trips.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <Bike className="h-12 w-12 opacity-30" />
        <p className="text-lg font-semibold">No rides yet</p>
        <p className="max-w-xs text-sm opacity-60">
          Your finished rides will appear here. Head to the Ride tab to record your first one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto no-scrollbar px-5 pt-1 pb-4 lg:px-8">
      {/* lifetime totals */}
      <div className="grid grid-cols-4 gap-2 rounded-box bg-base-200/50 p-3 ring-1 ring-base-content/5 elevate">
        <Total label="Rides" value={String(totals.count)} />
        <Total label="Distance" value={`${km(totals.dist, totals.dist < 100_000 ? 1 : 0)}`} unit="km" />
        <Total label="Time" value={durationShort(totals.dur)} />
        <Total label="Climbed" value={metres(totals.asc).replace(" m", "")} unit="m" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <RideCard key={trip.id} trip={trip} onClick={() => onOpen(trip)} />
        ))}
      </div>
    </div>
  )
}

function Total({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center">
      <div className="tnum text-lg font-bold leading-none">
        {value}
        {unit && <span className="text-xs font-normal opacity-50"> {unit}</span>}
      </div>
      <div className="mt-1 text-[0.65rem] uppercase tracking-wide opacity-50">{label}</div>
    </div>
  )
}

function RideCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const s = useMemo(() => computeStats(trip), [trip])
  const w = trip.weather[0]
  return (
    <button
      onClick={onClick}
      className="flex items-stretch gap-3 rounded-box bg-base-200/50 p-2.5 text-left ring-1 ring-base-content/5 elevate transition-colors hover:bg-base-200 active:scale-[0.99]"
    >
      <RouteMap
        points={trip.points}
        className="h-20 w-24 shrink-0"
        showEndpoints={false}
        maxSegments={120}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{trip.title}</span>
          {w && <span className="text-sm">{weatherIcon(w.code)}</span>}
        </div>
        <div className="text-xs opacity-50">
          {rideDate(trip.startedAt)} · {rideTime(trip.startedAt)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          <span className="flex items-center gap-1">
            <Route className="h-3 w-3 opacity-50" /> {distance(s.distanceM)}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3 opacity-50" /> {durationShort(s.durationMs)}
          </span>
          <span className="flex items-center gap-1">
            {kmh(s.avgSpeed)} km/h
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 opacity-50" /> {metres(s.ascentM)}
          </span>
        </div>
      </div>
      <ChevronRight className="my-auto h-5 w-5 shrink-0 opacity-30" />
    </button>
  )
}
