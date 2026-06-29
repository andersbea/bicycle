# Bicycle

A personal, installable bike-ride tracker. Start a ride and your phone records
speed, route, elevation (incline/decline) and the weather — everything is stored
on the device in `localStorage`, with a JSON backup you can drop into Google
Drive and re-import later.

## Features

- **Live tracking** — current speed, distance, duration, elevation gain/loss and
  a live route trail while you ride. The screen is kept awake via the Wake Lock
  API, and the in-progress ride is autosaved so a crash or reload recovers it.
- **Weather logging** — temperature, "feels like", conditions and wind are
  fetched from [Open-Meteo](https://open-meteo.com) at the start of a ride and
  every few minutes after (no API key, free). Can be turned off in Settings.
- **History** — every finished ride with a speed-tinted route map, full stats
  (distance, moving time, avg/max speed, ascent/descent, max grade) and an
  elevation profile.
- **Trends** — charts of distance / avg speed / climbing across your rides,
  lifetime totals, personal bests, and how your latest ride compares to your
  average.
- **Backup & restore** — export your whole history as a JSON file (upload it to
  Google Drive yourself), and import it back to restore a cleared device. Single
  rides can also be exported as JSON, CSV or GPX for external analytics.
- **Installable PWA** — add to home screen, launches standalone, works offline
  (weather aside, which needs network).
- Metric units throughout. Light & dark themes plus a handful of daisyUI themes.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · daisyUI 5 · `vite-plugin-pwa`
· Playwright. No backend, no accounts, no Google APIs.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/  (use --host to open on your phone)
npm run build    # production bundle
npm run preview  # serve the build
npm run lint     # eslint
npm test         # Playwright suite (desktop + mobile projects)
```

To exercise tracking locally, open the app on a phone over your LAN
(`npm run dev -- --host`) and allow location access — desktop browsers will
track too, but a phone gives real GPS.

## Backup workflow

1. **Settings → Export backup JSON** downloads `bicycle-backup-YYYY-MM-DD.json`.
2. Upload that file to Google Drive (or anywhere) yourself — the app never
   talks to Drive.
3. If `localStorage` is ever cleared, download the backup and use
   **Settings → Import from backup JSON** (choose *Merge* to add missing rides,
   or *Replace all* to overwrite).

## Permissions

- **Location** — required to track a ride (`navigator.geolocation`).
- **Screen wake lock** — requested while recording so the screen stays on;
  optional, the app works without it.

## Deployment

Pushes to `main` are built and published to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The build sets
`BASE_PATH=/bicycle/` so asset URLs and the PWA manifest scope match the repo's
Pages path. Serving from a different path? Set `BASE_PATH` accordingly.

## Notes & limitations

- Consumer GPS altitude is noisy, so incline/decline and grade are *smoothed
  estimates* (windowed-median filtering), not barometric-grade figures.
- Low-accuracy fixes (>50 m) are discarded to keep distance and elevation sane.
- Everything works offline from `localStorage`; only weather needs the network.
