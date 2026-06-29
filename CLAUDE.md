# CLAUDE.md

Guidance for working in this repo.

## GitHub account switching

This repo (`andersbea/bicycle`) is owned by the **`andersbea`** GitHub account.
This machine has two `gh` accounts and the credential helper defaults to the
other one (`swimand`), so unscoped `git push` / `gh` calls can hit a 403.

Account-switch commands (provided by the user's shell):

- **`gh-a`** — switch to `andersbea`
- **`gh-s`** — switch back to `swimand`

**Rule:** when an operation needs the `andersbea` account (pushing to this repo,
`gh` API calls against it, triggering/inspecting its workflows), run `gh-a`
first. **Always run `gh-s` to switch back once done**, even if the operation
fails — leave the account on `swimand`.

```sh
gh-a
git push origin main      # or the gh/git operation that needs andersbea
gh-s                      # always switch back
```

## Project overview

Personal bike-ride tracker PWA. Pure frontend, data in `localStorage`; network
only for weather (Open-Meteo). See `README.md` for the full feature list, stack,
backup/restore workflow, and deployment.

- **Stack:** React 19 · Vite · TypeScript · Tailwind v4 · daisyUI 5 ·
  `vite-plugin-pwa`. Metric units only.
- **Deploy:** push to `main` → GitHub Pages via `.github/workflows/deploy.yml`
  (`BASE_PATH=/bicycle/`). Live at https://andersbea.github.io/bicycle/.

## Commands

```sh
npm run dev        # dev server (add --host to reach it from a phone)
npm run build      # tsc -b + vite build
npm run lint       # eslint
npm test           # Vitest unit tests, then Playwright E2E
npm run test:unit  # unit tests only (fast)
npm run test:e2e   # Playwright E2E only
```

## Conventions

- Keep domain/data logic in `src/trip/` as pure, testable functions; UI in
  `src/views/` + `src/components/`; cross-cutting state in `src/hooks/`.
- Add/extend tests when changing behaviour: unit tests (`src/**/*.test.ts`) for
  pure logic, Playwright specs (`tests/*.spec.ts`) for user-facing flows. CI
  (`.github/workflows/test.yml`) runs lint + build + unit + E2E on every push/PR.
- The app is responsive: bottom dock on mobile, sidebar on desktop (`lg:`).
  Light/dark with a system-default theme. Preserve both when changing layout.
