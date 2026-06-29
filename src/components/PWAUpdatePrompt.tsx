import { useRegisterSW } from "virtual:pwa-register/react"
import { RefreshCw } from "lucide-react"

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.warn("SW registration failed", err)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="toast toast-center toast-top z-[80] w-full max-w-sm px-3 safe-top">
      <div className="alert bg-base-200/95 shadow-lg backdrop-blur">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span className="text-sm">A new version is available.</span>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
