import { useCallback, useState } from "react"
import { Bike, History, LineChart, Settings as SettingsIcon, Sun, Moon } from "lucide-react"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt"
import { TrackView } from "./views/TrackView"
import { HistoryView } from "./views/HistoryView"
import { TrendsView } from "./views/TrendsView"
import { SettingsView } from "./views/SettingsView"
import { TripDetail } from "./views/TripDetail"
import { useTripTracker } from "./hooks/useTripTracker"
import { useTheme } from "./hooks/useTheme"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { deleteTrip, loadTrips } from "./trip/storage"
import type { Trip } from "./trip/types"

type View = "track" | "history" | "trends" | "settings"

const NAV: { key: View; label: string; icon: typeof Bike }[] = [
  { key: "track", label: "Ride", icon: Bike },
  { key: "history", label: "History", icon: History },
  { key: "trends", label: "Trends", icon: LineChart },
  { key: "settings", label: "Settings", icon: SettingsIcon },
]

const TITLES: Record<View, string> = {
  track: "Bicycle",
  history: "History",
  trends: "Trends",
  settings: "Settings",
}

export default function App() {
  const { theme, setTheme, isDark, toggleMode } = useTheme()
  const [weatherEnabled, setWeatherEnabled] = useLocalStorage("bicycle.weather.v1", true)
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips())
  const [view, setView] = useState<View>("track")
  // Store the id, not the object, so the detail view always reflects the
  // current list (and clears itself when that ride is deleted).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (trips.find((t) => t.id === selectedId) ?? null) : null

  const refresh = useCallback(() => setTrips(loadTrips()), [])

  const handleFinish = useCallback((trip: Trip) => {
    setTrips(loadTrips())
    setSelectedId(trip.id)
  }, [])

  const tracker = useTripTracker({ onFinish: handleFinish, weatherEnabled })

  const openTrip = useCallback((t: Trip) => setSelectedId(t.id), [])

  const handleDelete = useCallback(
    (id: string) => {
      deleteTrip(id)
      setSelectedId(null)
      refresh()
    },
    [refresh],
  )

  const themeToggle = (
    <button
      onClick={toggleMode}
      className="btn btn-ghost btn-sm btn-circle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )

  return (
    <ErrorBoundary>
      <div className="relative h-full w-full overflow-hidden">
        <div className="bg-blob-a" />
        <div className="bg-blob-b" />

        <div className="relative z-10 flex h-full">
          {/* Desktop sidebar */}
          <Sidebar
            view={view}
            onNavigate={(v) => {
              setSelectedId(null)
              setView(v)
            }}
            recording={tracker.isActive}
            themeToggle={themeToggle}
          />

          {/* Content column */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col">
              {selected ? (
                <TripDetail
                trip={selected}
                dark={isDark}
                onBack={() => setSelectedId(null)}
                onDelete={handleDelete}
              />
              ) : (
                <>
                  <header className="flex items-center gap-2 px-4 py-2 safe-top safe-x lg:px-8">
                    <img
                      src={`${import.meta.env.BASE_URL}logo.svg`}
                      alt=""
                      className="h-7 w-7 rounded-lg lg:hidden"
                    />
                    <h1 className="text-lg font-bold tracking-tight lg:text-2xl">{TITLES[view]}</h1>
                    <span className="ml-auto lg:hidden">{themeToggle}</span>
                  </header>

                  <main className="min-h-0 flex-1">
                    <div className="mx-auto h-full w-full max-w-5xl">
                      {view === "track" && <TrackView tracker={tracker} />}
                      {view === "history" && <HistoryView trips={trips} onOpen={openTrip} />}
                      {view === "trends" && <TrendsView trips={trips} onOpen={openTrip} />}
                      {view === "settings" && (
                        <SettingsView
                          trips={trips}
                          theme={theme}
                          setTheme={setTheme}
                          weatherEnabled={weatherEnabled}
                          setWeatherEnabled={setWeatherEnabled}
                          onDataChanged={refresh}
                        />
                      )}
                    </div>
                  </main>
                </>
              )}
            </div>

            {/* Mobile / tablet bottom dock (normal flow → reserves its space) */}
            <BottomNav
              view={view}
              recording={tracker.isActive}
              onNavigate={(v) => {
                setSelectedId(null)
                setView(v)
              }}
            />
          </div>
        </div>

        <PWAUpdatePrompt />
      </div>
    </ErrorBoundary>
  )
}

function Sidebar({
  view,
  recording,
  onNavigate,
  themeToggle,
}: {
  view: View
  recording: boolean
  onNavigate: (v: View) => void
  themeToggle: React.ReactNode
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-base-content/10 bg-base-200/40 px-3 py-4 backdrop-blur lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-9 w-9 rounded-xl" />
        <span className="text-xl font-bold tracking-tight">Bicycle</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-primary/15 text-primary" : "opacity-70 hover:bg-base-content/5 hover:opacity-100"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {label}
              {key === "track" && recording && (
                <span className="ml-auto h-2 w-2 rounded-full bg-success" />
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto flex items-center justify-between px-2 pt-4">
        <span className="text-xs opacity-40">v{__APP_HASH__}</span>
        {themeToggle}
      </div>
    </aside>
  )
}

function BottomNav({
  view,
  recording,
  onNavigate,
}: {
  view: View
  recording: boolean
  onNavigate: (v: View) => void
}) {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-base-content/10 bg-base-200/85 backdrop-blur safe-bottom safe-x lg:hidden">
      {NAV.map(({ key, label, icon: Icon }) => {
        const active = view === key
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              active ? "text-primary" : "opacity-60 hover:opacity-100"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" />
            {label}
            {key === "track" && recording && (
              <span className="absolute right-[28%] top-1.5 h-2 w-2 rounded-full bg-success ring-2 ring-base-200" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
