import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatTileProps {
  icon?: LucideIcon
  label: string
  value: string
  unit?: string
  className?: string
  accent?: "primary" | "secondary" | "accent" | "none"
}

const ACCENT: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  none: "opacity-80",
}

export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  className,
  accent = "none",
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-box bg-base-200/60 px-3 py-2.5 ring-1 ring-base-content/5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wide opacity-60">
        {Icon && <Icon className={cn("h-3.5 w-3.5", ACCENT[accent])} />}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="tnum whitespace-nowrap text-2xl font-semibold leading-none">{value}</span>
        {unit && <span className="text-xs opacity-50">{unit}</span>}
      </div>
    </div>
  )
}
