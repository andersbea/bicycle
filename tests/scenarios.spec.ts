import { test, expect } from "@playwright/test"
import { ROUTE, feedRoute, recordRide } from "./helpers"

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation(ROUTE[0])
})

test("shows empty states before any rides", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "History" }).click()
  await expect(page.getByText("No rides yet")).toBeVisible()
  await page.getByRole("button", { name: "Trends" }).click()
  await expect(page.getByText("No data yet")).toBeVisible()
})

test("pause and resume toggles the recording state", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Start ride" }).click()
  await expect(page.getByText("Recording")).toBeVisible()

  await page.getByRole("button", { name: "Pause" }).click()
  await expect(page.getByText("Paused")).toBeVisible()

  await page.getByRole("button", { name: "Resume" }).click()
  await expect(page.getByText("Recording")).toBeVisible()

  // Can still finish from here.
  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible()
})

test("recovers the active ride after a reload", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Start ride" }).click()
  await feedRoute(page)

  // Reload mid-ride — the autosaved active trip should be restored.
  await page.reload()
  await expect(page.getByText("Recording")).toBeVisible()
  await expect(page.getByText(/\d+\s*m|\d+\.\d+\s*km/).first()).toBeVisible()

  // Clean up so it doesn't leak into other state.
  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()
})

test("deletes a ride from its detail view", async ({ page }) => {
  await page.goto("/")
  await recordRide(page) // lands on detail

  await page.getByRole("button", { name: "Delete ride" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()

  // Back on History, now empty.
  await page.getByRole("button", { name: "History" }).click()
  await expect(page.getByText("No rides yet")).toBeVisible()
})

test("theme toggle flips and persists the theme", async ({ page }) => {
  await page.goto("/")
  const readTheme = () => page.evaluate(() => document.documentElement.dataset.theme)
  const before = await readTheme()

  await page.getByRole("button", { name: /switch to (light|dark) mode/i }).click()
  await expect.poll(readTheme).not.toBe(before)
  const after = await readTheme()

  // Persisted across reload.
  await page.reload()
  await expect.poll(readTheme).toBe(after)
})

test("weather logging toggle persists across reload", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Settings" }).click()

  const toggle = page.getByRole("checkbox")
  await expect(toggle).toBeChecked() // on by default
  await toggle.click()
  await expect(toggle).not.toBeChecked()

  await page.reload()
  await page.getByRole("button", { name: "Settings" }).click()
  await expect(page.getByRole("checkbox")).not.toBeChecked()
})

test("exports a single ride as GPX", async ({ page }) => {
  await page.goto("/")
  await recordRide(page) // on detail view

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "GPX" }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.gpx$/)
})

test("trends shows charts and personal bests with rides recorded", async ({ page }) => {
  await page.goto("/")
  await recordRide(page)
  await page.getByRole("button", { name: "Back" }).click()

  await page.getByRole("button", { name: "Trends" }).click()
  await expect(page.getByText("Personal bests")).toBeVisible()
  await expect(page.getByText("Latest ride vs your average")).toBeVisible()
})
