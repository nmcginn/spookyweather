# Spooky Weather Tracker

**[spookyweather.pages.dev](https://spookyweather.pages.dev/)** — A lightweight, mobile-first, ad-free severe weather tracker.

All data comes from free, keyless, public-domain US government sources (NWS + SPC) plus a free NEXRAD radar tile layer. No backend — the browser talks directly to `api.weather.gov`.

### Goals

- Fast and small. Mobile-first. A real, pannable map.
- Fully static — deployable to Cloudflare Pages at zero server cost.
- Live warnings as polygons on a map, with a list/detail view and verbatim NWS text.
- Radar overlay + SPC tornado outlook and watches.

### Non-goals

- No live-streaming updates, voice alerts, or push notifications.
- No accounts, no saved locations, no database.
- No backend — a Cloudflare Worker proxy is a contingency only, if NWS ever throttles browser traffic.

## Development

```bash
npm install
npm run dev        # start dev server
npm run typecheck  # TypeScript strict check
npm run lint       # Biome lint + format check
npm test           # Vitest unit tests
npm run build      # production build → dist/ (includes bundle-size check)
```

## Deploy

Deploys to Cloudflare Pages. The `deploy` workflow fires on every push to `master`. Set the following repository secrets:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

## Architecture

| Concern     | Choice                          |
|-------------|---------------------------------|
| Build       | Vite + TypeScript               |
| Map         | MapLibre GL JS (lazy-loaded)    |
| Base tiles  | OpenFreeMap                     |
| Radar tiles | IEM NEXRAD n0q                  |
| Validation  | Zod                             |
| Tests       | Vitest                          |
| Lint        | Biome                           |
| PWA/SW      | vite-plugin-pwa + Workbox       |
| Deploy      | Cloudflare Pages                |

## Data sources

**Active warnings** — keyless, CORS-enabled, returns GeoJSON. Polled every 30–60 s with `ETag`/`If-None-Match` for cheap 304s.
```
GET https://api.weather.gov/alerts/active?event=Tornado%20Warning
```

**Radar** — Iowa Environmental Mesonet NEXRAD n0q base-reflectivity composite (~5-min refresh).
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png
```

**SPC outlook + watches** — static PNGs embedded with a last-fetched timestamp.
```
https://www.spc.noaa.gov/products/outlook/day1probotlk_torn.png
https://www.spc.noaa.gov/products/watch/validww.png
```
