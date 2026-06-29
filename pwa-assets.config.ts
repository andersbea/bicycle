import { defineConfig } from "@vite-pwa/assets-generator/config"

// Custom preset (the built-in minimal2023Preset renders maskable/apple icons on
// a WHITE background with heavy padding, which on Android's adaptive launcher
// shows the glyph floating on white instead of our dark tile). Here the logo is
// full-bleed on the app's dark background so the icon fills the whole tile.
const DARK_BG = "#0d0d12"

export default defineConfig({
  images: ["public/logo.svg"],
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, "favicon.ico"]],
    },
    maskable: {
      sizes: [512],
      // No padding — the logo already keeps its glyph within the safe zone, so
      // the dark background bleeds to the edges and fills the launcher tile.
      padding: 0,
      resizeOptions: { background: DARK_BG },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: DARK_BG },
    },
  },
})
