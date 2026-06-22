import { dedup } from "./dedup.ts";
import { normalizeFeature } from "./normalize.ts";
import { NwsFeatureCollectionSchema } from "./schema.ts";
import type { WeatherWarning } from "./types.ts";

export const SUPPORTED_EVENT_TYPES = [
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

const DEFAULT_URL = buildUrl(SUPPORTED_EVENT_TYPES);
const DEFAULT_INTERVAL_MS = 60_000;

// HTTP status codes we treat as transient (worth retrying with backoff)
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const BASE_RETRY_MS = 15_000;
const MAX_RETRY_MS = 5 * 60_000;

function buildUrl(eventTypes: readonly string[]): string {
  const params = eventTypes.map((e) => `event=${encodeURIComponent(e)}`).join("&");
  return `https://api.weather.gov/alerts/active?${params}`;
}

export type PollOptions = {
  url?: string;
  intervalMs?: number;
  onWarnings: (warnings: WeatherWarning[]) => void;
  onError?: (err: Error) => void;
};

export function startPoller(options: PollOptions): () => void {
  const { url = DEFAULT_URL, intervalMs = DEFAULT_INTERVAL_MS, onWarnings, onError } = options;
  let etag: string | null = null;
  let lastResult: WeatherWarning[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let consecutiveErrors = 0;

  async function poll(): Promise<void> {
    let nextDelay = intervalMs;
    try {
      const headers: Record<string, string> = { Accept: "application/geo+json" };
      if (etag) headers["If-None-Match"] = etag;

      const res = await fetch(url, { headers });

      if (res.status === 304) {
        consecutiveErrors = 0;
        onWarnings(lastResult);
        return;
      }

      if (!res.ok) {
        if (TRANSIENT_STATUSES.has(res.status)) {
          nextDelay = Math.min(BASE_RETRY_MS * 2 ** consecutiveErrors, MAX_RETRY_MS);
          consecutiveErrors++;
        } else {
          consecutiveErrors = 0;
        }
        throw new Error(`NWS API returned ${res.status}`);
      }

      const newEtag = res.headers.get("ETag");
      if (newEtag) etag = newEtag;

      const raw: unknown = await res.json();
      const collection = NwsFeatureCollectionSchema.parse(raw);
      lastResult = dedup(collection.features.map(normalizeFeature));
      consecutiveErrors = 0;
      onWarnings(lastResult);
    } catch (err) {
      // Network errors (fetch TypeError) are always transient
      if (err instanceof TypeError) {
        nextDelay = Math.min(BASE_RETRY_MS * 2 ** consecutiveErrors, MAX_RETRY_MS);
        consecutiveErrors++;
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!stopped) {
        timer = setTimeout(() => void poll(), nextDelay);
      }
    }
  }

  void poll();

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  };
}
