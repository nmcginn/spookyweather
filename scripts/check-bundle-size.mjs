/**
 * Fails if the initial (non-MapLibre) JS chunk exceeds the 50 KB gzip budget.
 * Run after `npm run build`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET_KB = 50;
const DIST_ASSETS = "dist/assets";

const jsFiles = readdirSync(DIST_ASSETS).filter((f) => f.endsWith(".js"));

// Heuristic: MapLibre chunk is by far the largest; our initial chunk is <100 KB raw.
// Exclude any file over 200 KB raw — that's the lazy MapLibre bundle.
const initialChunks = jsFiles.filter((f) => {
  const raw = statSync(join(DIST_ASSETS, f)).size;
  return raw < 200_000;
});

if (initialChunks.length === 0) {
  console.error("No initial JS chunks found in dist/assets");
  process.exit(1);
}

let exceeded = false;
for (const file of initialChunks) {
  const content = readFileSync(join(DIST_ASSETS, file));
  const gzipped = gzipSync(content);
  const kb = (gzipped.length / 1024).toFixed(1);
  const ok = gzipped.length <= BUDGET_KB * 1024;
  console.log(`${ok ? "✓" : "✗"} ${file}: ${kb} kB gzip (budget: ${BUDGET_KB} kB)`);
  if (!ok) exceeded = true;
}

if (exceeded) {
  console.error(`\nBundle budget exceeded! Keep initial JS under ${BUDGET_KB} kB gzip.`);
  process.exit(1);
} else {
  console.log("\nBundle budget OK.");
}
