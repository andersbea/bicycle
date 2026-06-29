import { Component, type ReactNode } from "react"
import { ACTIVE_KEY } from "@/trip/storage"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Top-level error boundary. The most likely crash source is a stale/corrupt
 * active-ride snapshot from an older schema, so the recovery button clears just
 * that slot (the ride history is left intact) and reloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught error:", error)
    console.error("[ErrorBoundary] Component stack:", info.componentStack)
  }

  private handleReset = () => {
    try {
      window.localStorage.removeItem(ACTIVE_KEY)
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="max-w-sm text-sm opacity-70">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <button type="button" onClick={this.handleReset} className="btn btn-outline btn-sm">
            Clear active ride and reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
