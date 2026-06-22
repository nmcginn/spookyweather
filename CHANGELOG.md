# Changelog

One entry per PR, newest first. Format: `- **#N** — description.`

---

- **#10** — Add live-site link to README, GitHub link on the live site, and auto-fit the map to active warning polygons on first load.
- **#9** — Fix SPC tray visible on load, broken close button, and reorder sections to show active watches before the day-1 outlook.
- **#8** — Phase 6: add SPC day-1 tornado outlook and active watches panel, accessible via a map toolbar button.
- **#7** — Phase 5: add toggleable NEXRAD radar overlay with opacity control and exponential-backoff poller error handling.
- **#6** — Sharpen warning sheet corners and cut animation durations for a snappier, less iOS-ish feel.
- **#5** — Phase 4: add mobile bottom-sheet warning list with two-way map↔list sync and full NWS text detail view.
- **#4** — Phase 3: render active tornado warning polygons on the map with severity-based colors, click popups, and live auto-refresh.
- **#3** — Phase 2: full-screen MapLibre map with OpenFreeMap tiles, geolocation, and lazy-loaded bundle (~1 KB initial JS).
- **#2** — Phase 1: typed NWS data layer — Zod schema, normalization to `TornadoWarning`, VTEC dedup/lifecycle, ETag poller, and 27 unit tests.
- **#1** — Phase 0: Vite + TypeScript scaffold with Biome, Vitest, GitHub Actions CI, and Cloudflare Pages deploy workflow.
