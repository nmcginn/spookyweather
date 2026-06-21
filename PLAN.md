# Tornado Tracker — Build Plan

A lightweight, mobile-first, ad-free tornado warning tracker. All data is free,
keyless, public-domain US government data (NWS + SPC) plus a free NEXRAD radar
tile layer. **No backend.** The browser talks to `api.weather.gov` directly.

This document is the source of truth for scope and sequencing. Work it
**one phase at a time**, one PR per phase (see Working Agreement).

---

## Goals

- Fast and small. Mobile-first. A real, pannable map is non-negotiable.
- Fully static — deployable to Cloudflare Pages / GitHub Pages, zero server cost.
- Show active tornado warnings as polygons on a map, with a list/detail view and
  the verbatim NWS warning text.
- Radar overlay + SPC tornado outlook and watches.

## Non-goals (explicitly out of scope)

- No live/streaming updates, voice alerts, or push notifications.
- No accounts, no saved locations, no database.
- No backend service in v1. (A Cloudflare Worker proxy is a *contingency* only,
  if NWS ever throttles browser traffic.)
- No severe-thunderstorm / flood / winter warnings in v1 — tornado only. (Easy to
  generalize later; the data layer is built event-agnostic so we can.)

---

## Tech stack

| Concern        | Choice                              | Why |
|----------------|-------------------------------------|-----|
| Build          | Vite + TypeScript                   | Fast, tiny output, no framework overhead |
| UI             | Vanilla TS + minimal DOM            | Keep the bundle small; the map is the app |
| Map            | MapLibre GL JS                      | Free, no API key, vector tiles, great mobile perf |
| Base tiles     | OpenFreeMap (`tiles.openfreemap.org`) | Keyless, no usage caps. Protomaps PMTiles as a self-host upgrade later |
| Radar tiles    | Iowa Env. Mesonet NEXRAD n0q        | Free XYZ tiles, ~5-min refresh, drops straight into MapLibre |
| Validation     | Zod                                 | Parse/validate the NWS response into our own types |
| Tests          | Vitest                              | Unit tests against captured fixtures |
| Lint/format    | Biome (or eslint+prettier)          | One tool, fast |
| Deploy         | Cloudflare Pages (or GitHub Pages)  | Static, free, instant |

Keep dependencies minimal. MapLibre is the only heavy one and must be
code-split / lazy-loaded so first paint isn't blocked.

---

## Data sources (reference)

**Active tornado warnings**
```
GET https://api.weather.gov/alerts/active?event=Tornado%20Warning
Accept: application/geo+json
```
- Keyless, CORS-enabled, returns a GeoJSON `FeatureCollection`.
- Respect `Cache-Control` / `Expires`; send `If-None-Match` with the prior `ETag`
  to get cheap `304`s. Poll every 30–60s.
- Build the data layer **event-agnostic** (param-driven) so adding watches or
  SVR warnings later is a config change, not a rewrite.

**SPC tornado outlook + watches (v1: static images)**
```
https://www.spc.noaa.gov/products/outlook/day1probotlk_torn.png
https://www.spc.noaa.gov/products/watch/validww.png
```
- v1 just embeds these PNGs with a "last fetched" timestamp.
- Stretch: replace with SPC outlook/watch GeoJSON as real map layers.

**Radar (NEXRAD base reflectivity composite)**
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png
```
- Web-Mercator XYZ raster layer. Add as a MapLibre raster source under the
  warning polygons. Refresh by cache-busting the source every ~5 min.

### Normalized internal type

The NWS schema is verbose and CAP-derived. Parse it into our own flat type and
never let the raw shape leak past the data layer.

```ts
type TornadoWarning = {
  id: string;                 // properties.id
  vtec: string | null;        // parameters.VTEC[0] — stable event key for dedup
  messageType: "Alert" | "Update" | "Cancel" | string;
  polygon: GeoJSON.Polygon | null;   // geometry; null => fall back to zones (rare)
  counties: string;           // properties.areaDesc
  sent: string;               // ISO
  expires: string;            // ISO — drives the countdown
  detection: "RADAR INDICATED" | "OBSERVED" | null; // parameters.tornadoDetection
  damageThreat: "CONSIDERABLE" | "CATASTROPHIC" | null; // PDS / Tornado Emergency
  motion: string | null;      // parameters.eventMotionDescription
  headline: string | null;
  description: string;        // raw NWS text
  instruction: string | null;
  senderName: string;         // e.g. "NWS Springfield MO"
};
```

### Dedup / lifecycle rules

- Group by VTEC event (office + phenomena + ETN). Keep the latest `Update`.
- A `Cancel` message removes that event from the active set.
- Drop anything past `expires` client-side (don't wait for the next poll).

### Color semantics (used in Phase 3)

- Radar-indicated warning → standard warning color.
- `OBSERVED` (confirmed tornado) → stronger color.
- `CONSIDERABLE` (PDS) → escalated.
- `CATASTROPHIC` (Tornado Emergency) → max-severity / distinct treatment.

---

## Working Agreement (read before starting any phase)

- **One phase = one PR.** Each PR is independently reviewable, mergeable, and
  deployable. No monster PRs that span phases.
- **Stop at phase boundaries** for review before starting the next phase.
- Conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
  **No tool/session attribution in commit messages.**
- Every phase ends green: typecheck + lint + tests + build all pass in CI.
- Phases that touch the data layer ship with unit tests against a captured
  fixture (a real `/alerts/active` response saved to `src/__fixtures__/`).
- Keep a running `## Progress` checklist at the bottom of this file; check items
  off as phases land.
- Performance budget: keep the initial JS (excluding lazy-loaded MapLibre) under
  ~50 KB gzip. MapLibre loads on demand.

---

## Phases

### Phase 0 — Scaffold
A buildable, deployable empty shell.
- Vite + TS project, strict tsconfig.
- Biome (or eslint+prettier), Vitest wired up.
- GitHub Actions CI: typecheck, lint, test, build.
- Cloudflare Pages (or GH Pages) deploy config.
- `README.md` + this `PLAN.md`.
- **Done when:** `main` deploys a blank page and CI is green.

### Phase 1 — NWS data layer (no UI)
- Typed client for `/alerts/active?event=Tornado Warning`.
- Zod schema for the NWS feature; normalize to `TornadoWarning`.
- Dedup/lifecycle rules (VTEC grouping, Cancel handling, expiry).
- Poller with configurable interval + `ETag`/`If-None-Match`.
- Capture a real response to `src/__fixtures__/alerts-active.json`; unit-test
  parsing, normalization, and dedup against it.
- **Done when:** a tested module returns a clean, deduped `TornadoWarning[]`.

### Phase 2 — Map shell
- MapLibre mounts full-screen, mobile-first, OpenFreeMap base style.
- Geolocate + zoom controls. Sensible default view (CONUS).
- Lazy-load MapLibre so it doesn't block first paint.
- No data yet.
- **Done when:** a smooth, pannable map on a phone.

### Phase 3 — Warning polygons on the map
- Feed Phase 1 data into a GeoJSON source; fill + line layers.
- Color by `detection` / `damageThreat` per the semantics above.
- Tap a polygon → popup: counties, expiry countdown, link to full text.
- Auto-refresh from the poller; add/remove polygons as warnings change.
- **Done when:** live tornado warnings render and update on the map.

### Phase 4 — Warning list + detail
- Mobile bottom-sheet / drawer listing active warnings, newest first.
- Tap an item → full NWS text + motion + expiry countdown.
- Empty state: "No active tornado warnings."
- Two-way sync: tapping a list item flies to its polygon and vice-versa.
- **Done when:** the list/detail mirrors the map and shows verbatim text.

### Phase 5 — Radar overlay
- IEM NEXRAD n0q raster layer beneath the polygons, toggleable.
- Opacity control; cache-bust refresh every ~5 min.
- **Done when:** radar toggles cleanly under the warnings.

### Phase 6 — SPC outlook + watches
- A panel/view embedding the day-1 tornado outlook PNG and watches PNG with a
  "last updated" timestamp and a manual refresh.
- **Done when:** outlook + watches are viewable. (GeoJSON layers = later stretch.)

### Phase 7 — Polish & ship
- PWA manifest + icons (installable; **no** push). Offline app shell.
- Lighthouse/perf pass; enforce the bundle budget.
- Meta/OG tags, favicon, accessibility pass, small About page.
- **Done when:** Lighthouse mobile is solid and it's genuinely shippable.

---

## Progress
- [x] Phase 0 — Scaffold
- [ ] Phase 1 — NWS data layer
- [ ] Phase 2 — Map shell
- [ ] Phase 3 — Warning polygons
- [ ] Phase 4 — List + detail
- [ ] Phase 5 — Radar overlay
- [ ] Phase 6 — SPC outlook + watches
- [ ] Phase 7 — Polish & ship
- [ ] 
