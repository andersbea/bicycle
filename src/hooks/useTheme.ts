import { useEffect, useState } from "react"
import { useLocalStorage } from "./useLocalStorage"

/** Concrete theme names that ship in src/index.css (custom + daisyUI built-ins). */
export const THEMES = [
  "bicycle",
  "bicycle-light",
  "night",
  "dim",
  "synthwave",
  "retro",
  "forest",
  "winter",
  "aqua",
  "coffee",
] as const

export type Theme = (typeof THEMES)[number]
/** Stored preference: a concrete theme, or "system" to follow the OS. */
export type ThemePref = Theme | "system"

/** Themes whose color-scheme is dark — drives the light/dark toggle icon. */
const DARK_THEMES = new Set<Theme>([
  "bicycle",
  "night",
  "dim",
  "synthwave",
  "forest",
  "aqua",
  "coffee",
])

const DARK_MQ = "(prefers-color-scheme: dark)"

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<ThemePref>("bicycle.theme.v1", "system")
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DARK_MQ).matches,
  )

  // Track the OS colour-scheme. setState lives in the event callback, not the
  // effect body, so this doesn't cascade renders.
  useEffect(() => {
    const mql = window.matchMedia(DARK_MQ)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  const applied: Theme =
    theme === "system" ? (systemDark ? "bicycle" : "bicycle-light") : theme

  useEffect(() => {
    document.documentElement.dataset.theme = applied
  }, [applied])

  const isDark = DARK_THEMES.has(applied)
  /** Quick toggle between the custom light & dark themes. */
  const toggleMode = () => setTheme(isDark ? "bicycle-light" : "bicycle")

  return { theme, setTheme, applied, isDark, toggleMode }
}
