import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      strategies: "generateSW",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            // NWS alerts — network-only (always need fresh data)
            urlPattern: /^https:\/\/api\.weather\.gov\//,
            handler: "NetworkOnly",
          },
          {
            // Map base tiles — cache-first, 7-day TTL
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Radar tiles — stale-while-revalidate, 10-min TTL
            urlPattern: /^https:\/\/mesonet\.agron\.iastate\.edu\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "radar-tiles",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // SPC images — stale-while-revalidate, 30-min TTL
            urlPattern: /^https:\/\/www\.spc\.noaa\.gov\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "spc-images",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Spooky Weather Tracker",
        short_name: "SpookyWx",
        description:
          "Live NWS tornado, severe thunderstorm, and flash flood warnings on a map. Ad-free, keyless, fully static.",
        start_url: "/",
        display: "standalone",
        background_color: "#0c0e14",
        theme_color: "#0c0e14",
        orientation: "any",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
