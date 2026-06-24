# Enhancements

A loose backlog of future ideas — not a committed roadmap, not phased work.
Pick anything off here in any order; each entry is self-contained.

**Conventions for this file**
- Effort is a rough t-shirt size: **S** (an afternoon), **M** (a day or two),
  **L** (a weekend+).
- Each idea notes its approach and any data source so it can be handed to
  Claude Code without re-research.
- All ideas must hold the project's non-goals: **no backend, no accounts, no
  saved locations, no notifications.** Notes call out compliance where it's
  non-obvious.
- Anything actually committed to should graduate to a GitHub Issue (label:
  `enhancement`). This file is the parking lot, not the plan of record.

---

## Quick wins

### "Am I in a warning?" — one-shot geolocate · S
A button that calls `navigator.geolocation.getCurrentPosition` once, flies the
map there, and reports whether the point falls inside any active warning polygon.
- Polygons are already loaded client-side, so this is a ray-cast point-in-polygon
  test (tiny helper or a small dep). No extra network call needed.
- Alternative/confirmation: NWS supports `GET /alerts/active?point={lat},{lng}`.
- **Non-goals:** one-shot only — do **not** persist the location or watch it.
  This is "check once," not a saved home location or background monitoring.
- Highest user value here: it's the literal question every visitor has.

### Shareable URL state · S
Encode map view in the URL hash (`#z6/37.2/-93.3`) and the selected warning
(`#warning/<id>`) so any view is linkable/bookmarkable.
- Debounce MapLibre `moveend` → write `getCenter()` / `getZoom()` to the hash.
- Parse the hash on load to restore view + reopen a warning's detail.
- Same deep-link pattern as the `?map=` codes in the ball-game project.

### Stale-data / fetch-failure indicator · S
Show "updated 0:42 ago" and a visible banner when a poll fails (offline, 5xx,
throttled). For a safety-adjacent tool, freshness signaling is a trust feature.
- Track the last *successful* fetch timestamp; render relative time.
- Reflect the active-warning count in the document title, e.g. `(3) Spooky Weather`.
- Bonus a11y: an `aria-live="polite"` region announcing the count change. Frame
  this as accessibility, not a notification — it's passive, in-page, no push.

### Color legend · S
A small, dismissible legend mapping polygon colors to meaning:
radar-indicated → observed/confirmed → PDS (considerable) → Tornado Emergency
(catastrophic). Most visitors don't know the semantics the colors already encode.
- Reuse the exact color tokens from the polygon styling so it stays in sync.

---

## Bigger swings

### Storm motion vector / projected path · M
We already parse `eventMotionDescription` (ISO time, bearing in DEG, speed in KT,
and a lat/lon). Use it to draw a short projected-path arrow, or surface
"near {Town} around {time}."
- Project the position forward N minutes (a flat-earth approximation is fine at
  warning scale) and render as a line/arrow layer above the polygon.
- Optional: a faint forward "cone" to convey uncertainty.

### Animated radar loop · M
Replace the single radar frame with an animated loop of the last ~hour.
- Easiest source is RainViewer's free, keyless API:
  `https://api.rainviewer.com/public/weather-maps.json` returns `radar.past[]`
  (and `radar.nowcast[]`) frames, each with a `time` and `path`. Build tile URLs
  from `host` + `path` and swap the MapLibre raster source per frame.
- Less fiddly than looping IEM n0q archives by hand. Could complement or replace
  the current IEM still.
- Add a play/pause + scrubber; keep it paused by default to save mobile battery.

### Watches as real polygons · M
The planned stretch goal: swap the static SPC watch PNG for actual watch geometry
as a map layer, so watches and warnings share one map.
- SPC active watch geometry is published as GeoJSON (IEM mirrors it); **verify
  the current endpoint** before wiring it up.
- Render as a low-opacity fill *beneath* the warning polygons.
- Would let the SPC panel fold into the map instead of being a separate image.

---

## Parking lot (raw, unfiltered)
Ideas worth remembering but not yet thought through:
- Mesoscale Discussions (SPC MD) as an additional layer — areas SPC is watching
  *before* watches issue.
- Local Storm Reports (LSRs) — plot confirmed tornado/hail/wind reports for context.
- Reduced-motion / prefers-color-scheme respect for the radar loop and animations.
- County/zone-geometry fallback for the rare polygon-less warning.
- 
