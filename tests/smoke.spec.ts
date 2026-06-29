import { test, expect } from "@playwright/test"
import { ROUTE, feedRoute, recordRide, RIDE_TITLE } from "./helpers"

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation(ROUTE[0])
})

test("loads to the ready screen", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Ready to ride" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Start ride" })).toBeVisible()
})

test("records a ride and saves it to history", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Start ride" }).click()
  await expect(page.getByText("Recording")).toBeVisible()

  await feedRoute(page)

  // Distance should have accumulated beyond zero.
  await expect(page.getByText(/\d+\s*m|\d+\.\d+\s*km/).first()).toBeVisible()

  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()

  // We land on the ride detail; go back and open History.
  await page.getByRole("button", { name: "Back" }).click()
  await page.getByRole("button", { name: "History" }).click()
  await expect(page.getByText(RIDE_TITLE).first()).toBeVisible()
})

test("backup export then import restores rides", async ({ page }) => {
  await page.goto("/")
  await recordRide(page)
  await page.getByRole("button", { name: "Back" }).click()

  // Export the backup and grab the file.
  await page.getByRole("button", { name: "Settings" }).click()
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export backup JSON/ }).click(),
  ])
  const backupPath = await download.path()

  // Wipe everything.
  await page.getByRole("button", { name: "Clear all rides" }).click()
  await page.getByRole("button", { name: "Delete everything" }).click()

  // History is now empty.
  await page.getByRole("button", { name: "History" }).click()
  await expect(page.getByText("No rides yet")).toBeVisible()

  // Import the backup back in.
  await page.getByRole("button", { name: "Settings" }).click()
  await page.locator('input[type="file"]').setInputFiles(backupPath)

  // The ride returns to history.
  await page.getByRole("button", { name: "History" }).click()
  await expect(page.getByText(RIDE_TITLE).first()).toBeVisible()
})
