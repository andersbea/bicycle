import { test, expect, type Page } from "@playwright/test"

// A short fake route near central Gothenburg — each point ~30–40 m apart.
const ROUTE = [
  { latitude: 57.7089, longitude: 11.9746, accuracy: 5 },
  { latitude: 57.7092, longitude: 11.9749, accuracy: 5 },
  { latitude: 57.7096, longitude: 11.9753, accuracy: 5 },
  { latitude: 57.7101, longitude: 11.9758, accuracy: 5 },
  { latitude: 57.7106, longitude: 11.9764, accuracy: 5 },
]

async function feedRoute(page: Page) {
  for (const pos of ROUTE) {
    await page.context().setGeolocation(pos)
    await page.waitForTimeout(400)
  }
}

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

  // Recording UI appears.
  await expect(page.getByText("Recording")).toBeVisible()

  await feedRoute(page)

  // Distance should have accumulated beyond zero.
  await expect(page.getByText(/\d+\s*m|\d+\.\d+\s*km/).first()).toBeVisible()

  // Finish the ride.
  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()

  // We land on the ride detail; go back and open History.
  await page.getByRole("button", { name: "Back" }).click()
  await page.getByRole("button", { name: "History" }).click()

  // A ride card with a "ride" title should be listed.
  await expect(
    page.getByText(/(morning|afternoon|evening|night) ride/i).first(),
  ).toBeVisible()
})

test("backup export then import restores rides", async ({ page }) => {
  await page.goto("/")

  // Record a quick ride.
  await page.getByRole("button", { name: "Start ride" }).click()
  await feedRoute(page)
  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()
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
  await expect(
    page.getByText(/(morning|afternoon|evening|night) ride/i).first(),
  ).toBeVisible()
})
