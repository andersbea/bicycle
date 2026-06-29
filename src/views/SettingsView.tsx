import { useRef, useState } from "react"
import {
  Palette,
  CloudSun,
  Download,
  Upload,
  Trash2,
  Info,
  Check,
} from "lucide-react"
import type { Trip } from "@/trip/types"
import { THEMES, type ThemePref } from "@/hooks/useTheme"
import { downloadBackup } from "@/trip/export"
import { importBackupFile } from "@/trip/import"
import type { MergeMode } from "@/trip/storage"
import { clearAllTrips, SCHEMA_VERSION } from "@/trip/storage"

interface SettingsProps {
  trips: Trip[]
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  weatherEnabled: boolean
  setWeatherEnabled: (v: boolean) => void
  onDataChanged: () => void
}

export function SettingsView({
  trips,
  theme,
  setTheme,
  weatherEnabled,
  setWeatherEnabled,
  onDataChanged,
}: SettingsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<MergeMode>("merge")
  const [toast, setToast] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3500)
  }

  const handleImport = async (file: File) => {
    const { parse, merge } = await importBackupFile(file, mode)
    if (!parse.ok) {
      flash(parse.error ?? "Import failed.")
      return
    }
    onDataChanged()
    const skipped = parse.skipped ? `, ${parse.skipped} skipped` : ""
    flash(
      mode === "replace"
        ? `Restored ${merge?.total ?? 0} rides${skipped}.`
        : `Imported ${merge?.added ?? 0} new rides (${merge?.total ?? 0} total)${skipped}.`,
    )
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-1 pb-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <label className="mb-1 block text-xs opacity-60">Theme</label>
        <select
          className="select select-bordered w-full"
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemePref)}
        >
          <option value="system">System (auto light/dark)</option>
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t === "bicycle" ? "Bicycle (dark)" : t === "bicycle-light" ? "Bicycle (light)" : t}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs opacity-50">
          The sun/moon button in the header quickly flips light ↔ dark.
        </p>
      </Section>

      {/* Tracking */}
      <Section icon={CloudSun} title="Tracking">
        <label className="flex cursor-pointer items-center justify-between">
          <span>
            <span className="font-medium">Weather logging</span>
            <span className="block text-xs opacity-60">
              Fetch temperature & conditions from Open-Meteo during rides (needs network).
            </span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={weatherEnabled}
            onChange={(e) => setWeatherEnabled(e.target.checked)}
          />
        </label>
      </Section>

      {/* Backup */}
      <Section icon={Download} title="Backup & restore">
        <p className="mb-2 text-xs opacity-60">
          Rides live only in this device's storage. Export a backup file and keep it in Google Drive;
          import it to restore after clearing data or switching devices.
        </p>
        <button
          className="btn btn-primary btn-block btn-sm"
          onClick={() => downloadBackup(trips)}
          disabled={trips.length === 0}
        >
          <Download className="h-4 w-4" /> Export backup JSON ({trips.length})
        </button>

        <div className="divider my-1 text-xs opacity-40">restore</div>

        <div className="mb-2 flex gap-2">
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-field border px-3 py-2 text-sm ${mode === "merge" ? "border-primary bg-primary/10" : "border-base-content/15"}`}>
            <input type="radio" className="radio radio-xs radio-primary" checked={mode === "merge"} onChange={() => setMode("merge")} />
            Merge (keep current)
          </label>
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-field border px-3 py-2 text-sm ${mode === "replace" ? "border-primary bg-primary/10" : "border-base-content/15"}`}>
            <input type="radio" className="radio radio-xs radio-primary" checked={mode === "replace"} onChange={() => setMode("replace")} />
            Replace all
          </label>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImport(f)
            e.target.value = ""
          }}
        />
        <button className="btn btn-outline btn-block btn-sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Import from backup JSON
        </button>
      </Section>

      {/* Danger zone */}
      <Section icon={Trash2} title="Data">
        <button
          className="btn btn-error btn-outline btn-block btn-sm"
          onClick={() => setConfirmClear(true)}
          disabled={trips.length === 0}
        >
          <Trash2 className="h-4 w-4" /> Clear all rides
        </button>
      </Section>

      {/* About */}
      <Section icon={Info} title="About">
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="opacity-60">App</dt>
          <dd className="text-right">Bicycle</dd>
          <dt className="opacity-60">Build</dt>
          <dd className="text-right tnum">{__APP_HASH__} · {__APP_BUILT__}</dd>
          <dt className="opacity-60">Data schema</dt>
          <dd className="text-right tnum">v{SCHEMA_VERSION}</dd>
          <dt className="opacity-60">Stored rides</dt>
          <dd className="text-right tnum">{trips.length}</dd>
        </dl>
        <p className="mt-2 text-xs opacity-40">
          All data stays on your device. Weather from open-meteo.com.
        </p>
      </Section>
      </div>

      {toast && (
        <div className="toast toast-center toast-bottom z-[80] safe-bottom">
          <div className="alert alert-success">
            <Check className="h-4 w-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="modal modal-open" role="dialog">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Clear all rides?</h3>
            <p className="py-2 text-sm opacity-70">
              This deletes all {trips.length} rides from this device. Make sure you have a backup first —
              this can't be undone.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => {
                  clearAllTrips()
                  setConfirmClear(false)
                  onDataChanged()
                  flash("All rides cleared.")
                }}
              >
                Delete everything
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setConfirmClear(false)} />
        </div>
      )}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Info
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-box bg-base-200/40 p-4 ring-1 ring-base-content/5 elevate">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  )
}
