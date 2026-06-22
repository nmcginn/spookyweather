# CLAUDE.md — Tornado Tracker

AI coding assistant context for this repo. Read this before starting any task.

---

## What this project is

A lightweight, mobile-first, ad-free tornado warning tracker. Fully static — no backend. The browser talks directly to `api.weather.gov`. Deployable to Cloudflare Pages at zero cost.

See [PLAN.md](./PLAN.md) for the full architecture, data-source specs, and normalized types.

---

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build → dist/
npm run typecheck    # strict TS check, no emit
npm run lint         # Biome lint + format check (CI gate)
npm run lint:fix     # Biome auto-fix
npm test             # Vitest unit tests (run once)
npm run test:watch   # Vitest watch mode
```

**Before every PR:** `npm run typecheck && npm run lint && npm test && npm run build` must all pass.

---

## Repo layout

```
src/
  nws/          # Data layer: schema (Zod), normalize, dedup, poller
  map/          # MapLibre integration: init, warnings, radar, SPC control
  ui/           # DOM UI: warning sheet, SPC panel
  __fixtures__/ # Captured NWS API responses for unit tests
  main.ts       # Entry point — orchestrates data ↔ map ↔ UI
  style.css     # All styles (single file, no CSS modules)
```

No framework. Vanilla TypeScript + direct DOM. MapLibre is the only heavy dependency and is lazy-loaded via dynamic `import()` so it doesn't block first paint.

---

## Key architectural rules

- **No raw NWS shapes past the data layer.** Parse and normalize to `TornadoWarning` (defined in `src/nws/types.ts`) before anything touches the data.
- **Event-agnostic data layer.** The poller and schema are param-driven so adding new event types is a config change, not a rewrite.
- **Fixtures for every data-layer change.** Unit tests in `src/nws/` and `src/map/warning-data.test.ts` run against `src/__fixtures__/alerts-active.json`. If you change the schema or normalization, update the fixture tests too.
- **Performance budget:** Initial JS (excluding lazy MapLibre) must stay under ~50 KB gzip. Don't add heavy deps without discussion.
- **No comments that describe what the code does.** Only add a comment when the *why* is non-obvious (hidden constraint, subtle invariant, external workaround).

---

## Working agreement

- **One phase = one PR, as a convention.** Hotfixes and isolated polish tweaks may be standalone PRs outside the phase sequence — that's fine. The convention exists to keep PRs reviewable, not as a rigid gate.
- **Every PR → one entry in [CHANGELOG.md](./CHANGELOG.md).** Format: `- **#N** — <one succinct sentence>.` Add it in the same PR. See the Changelog rule section below.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `test:`, `docs:`. No tool or session attribution in commit messages.
- **Every PR must be green:** typecheck + lint + tests + build all pass in CI before merge.
- **Stop at phase boundaries** for review before starting the next phase.

---

## Changelog rule

Every PR — phase, hotfix, or polish — must add exactly one entry to `CHANGELOG.md` as part of the same PR. Format:

```
- **#N** — One sentence describing what changed and why it matters.
```

Keep it factual and under ~120 characters. No implementation detail, no bullet sub-lists. The PR diff is the detail; the changelog entry is the summary.

---

## Phase status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Scaffold | ✅ done |
| 1 | NWS data layer | ✅ done |
| 2 | Map shell | ✅ done |
| 3 | Warning polygons | ✅ done |
| 4 | Warning list + detail | ✅ done |
| 5 | Radar overlay | ✅ done |
| 6 | SPC outlook + watches | ✅ done |
| 7 | Polish & ship | 🔲 next |

**Phase 7 scope:** PWA manifest + icons (installable, no push), offline app shell, Lighthouse/perf pass, bundle budget enforcement, meta/OG tags, favicon, accessibility pass, small About page.

---

## Deploy

Cloudflare Pages. The `deploy` workflow fires on every push to `master`. Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
