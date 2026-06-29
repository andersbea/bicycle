import path from "node:path"
import { defineConfig } from "vitest/config"

// Standalone config for unit tests — deliberately does NOT load the app's
// vite.config.ts (and its React / PWA plugins), so unit tests stay fast and
// isolated from the build pipeline. Playwright E2E lives separately in tests/.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
})
