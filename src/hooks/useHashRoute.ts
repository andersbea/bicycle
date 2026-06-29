import { useCallback, useEffect, useState } from "react"

export type View = "track" | "history" | "trends" | "settings"
const VIEWS: View[] = ["track", "history", "trends", "settings"]

export interface Route {
  view: View
  /** When set, a ride detail is open (over the History view). */
  tripId: string | null
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "")
  if (raw.startsWith("ride/")) {
    const id = decodeURIComponent(raw.slice("ride/".length))
    return { view: "history", tripId: id || null }
  }
  if ((VIEWS as string[]).includes(raw)) return { view: raw as View, tripId: null }
  return { view: "track", tripId: null }
}

function toHash(r: Route): string {
  return r.tripId ? `#/ride/${encodeURIComponent(r.tripId)}` : `#/${r.view}`
}

/**
 * Keeps the open view (and any open ride detail) in the URL hash, so a refresh
 * or shared link restores the same screen. Hash-based so it needs no server
 * rewrites — works on GitHub Pages under /bicycle/.
 *
 * Navigation assigns `location.hash`; the single `hashchange` listener is the
 * source of truth, which also makes the browser back/forward buttons work.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash())

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener("hashchange", onHash)
    // Normalise a bare URL to an explicit hash so the first refresh is stable.
    if (!window.location.hash) {
      window.history.replaceState(null, "", toHash(parseHash()))
    }
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const go = useCallback((next: Route) => {
    const hash = toHash(next)
    if (window.location.hash === hash) {
      setRoute(next) // same hash → no event, sync directly
    } else {
      window.location.hash = hash // fires hashchange → listener updates state
    }
  }, [])

  const navigate = useCallback((view: View) => go({ view, tripId: null }), [go])
  const openTrip = useCallback((tripId: string) => go({ view: "history", tripId }), [go])
  const closeTrip = useCallback(() => go({ view: "history", tripId: null }), [go])

  return { view: route.view, tripId: route.tripId, navigate, openTrip, closeTrip }
}
