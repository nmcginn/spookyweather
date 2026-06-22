# Tornado Tracker

**[spookyweather.pages.dev](https://spookyweather.pages.dev/)** — A lightweight, mobile-first, ad-free tornado warning tracker.

All data comes from free, keyless, public-domain US government sources (NWS + SPC) plus a free NEXRAD radar tile layer. No backend — the browser talks directly to `api.weather.gov`.

## Development

```bash
npm install
npm run dev        # start dev server
npm run typecheck  # TypeScript strict check
npm run lint       # Biome lint + format check
npm test           # Vitest unit tests
npm run build      # production build → dist/
```

## Deploy

Deploys to Cloudflare Pages. The `deploy` workflow fires on every push to `master`. Set the following repository secrets:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

## Architecture

See [PLAN.md](./PLAN.md) for the full build plan and phase breakdown.

| Concern     | Choice                  |
|-------------|-------------------------|
| Build       | Vite + TypeScript       |
| Map         | MapLibre GL JS (lazy)   |
| Base tiles  | OpenFreeMap             |
| Radar tiles | IEM NEXRAD n0q          |
| Validation  | Zod                     |
| Tests       | Vitest                  |
| Lint        | Biome                   |
| Deploy      | Cloudflare Pages        |

## Data sources

- **Active warnings** — `https://api.weather.gov/alerts/active?event=Tornado%20Warning`
- **Radar** — Iowa Env. Mesonet NEXRAD n0q XYZ tiles
- **SPC outlook** — static PNGs from `spc.noaa.gov`
