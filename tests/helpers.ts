import { expect, type Page } from "@playwright/test"

// A short fake route near central Gothenburg — each point ~30–40 m apart.
export const ROUTE = [
  { latitude: 57.7089, longitude: 11.9746, accuracy: 5 },
  { latitude: 57.7092, longitude: 11.9749, accuracy: 5 },
  { latitude: 57.7096, longitude: 11.9753, accuracy: 5 },
  { latitude: 57.7101, longitude: 11.9758, accuracy: 5 },
  { latitude: 57.7106, longitude: 11.9764, accuracy: 5 },
]

/** Feed the fake route to the page's geolocation watch, point by point. */
export async function feedRoute(page: Page) {
  for (const pos of ROUTE) {
    await page.context().setGeolocation(pos)
    await page.waitForTimeout(400)
  }
}

/** Start a ride, feed the route, then finish & save it. Leaves the app on the
 *  finished ride's detail view. */
export async function recordRide(page: Page) {
  await page.getByRole("button", { name: "Start ride" }).click()
  await expect(page.getByText("Recording")).toBeVisible()
  await feedRoute(page)
  await page.getByRole("button", { name: "Finish" }).click()
  await page.getByRole("button", { name: "Finish & save" }).click()
}

/** Matches the auto-generated ride titles ("Morning ride", etc.). */
export const RIDE_TITLE = /(morning|afternoon|evening|night) ride/i
