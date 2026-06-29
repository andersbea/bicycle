import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.TEST_PORT ?? 4180)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
  // Only E2E specs here; Vitest unit tests (src/**/*.test.ts) are run separately.
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    // Block the PWA service worker in dev mode — its auto-update reloads
    // would otherwise destroy Playwright's execution context mid-test.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      // Chromium-based emulation so we don't need WebKit installed.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
