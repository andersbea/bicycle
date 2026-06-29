import type { WeatherSnapshot } from "@/trip/types"
import { weatherIcon } from "@/trip/weather"
import { temp, compass } from "@/trip/format"
import { Wind } from "lucide-react"

export function WeatherBadge({ w, compact = false }: { w: WeatherSnapshot; compact?: boolean }) {
  if (compact) {
    return (
      <span className="badge badge-ghost gap-1 text-sm">
        <span>{weatherIcon(w.code)}</span>
        <span className="tnum font-medium">{temp(w.tempC)}</span>
      </span>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-box bg-base-200/60 px-3 py-2 ring-1 ring-base-content/5">
      <span className="text-2xl leading-none">{weatherIcon(w.code)}</span>
      <div className="leading-tight">
        <div className="tnum text-lg font-semibold">
          {temp(w.tempC)} <span className="text-xs font-normal opacity-50">feels {temp(w.apparentC)}</span>
        </div>
        <div className="text-xs opacity-60">{w.condition}</div>
      </div>
      <div className="ml-auto flex items-center gap-1 text-xs opacity-60">
        <Wind className="h-3.5 w-3.5" />
        <span className="tnum">{Math.round(w.windKph)}</span> km/h {compass(w.windDir)}
      </div>
    </div>
  )
}
