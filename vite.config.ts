import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    // MapLibre is intentionally lazy-loaded; its chunk is large by design.
    chunkSizeWarningLimit: 1500,
  },
});
