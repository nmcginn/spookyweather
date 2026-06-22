import { dedup } from "./dedup.ts";
import { normalizeFeature } from "./normalize.ts";
import { NwsFeatureCollectionSchema } from "./schema.ts";
import type { NwsFeature } from "./schema.ts";
import type { WeatherWarning } from "./types.ts";

export const SUPPORTED_EVENT_TYPES = [
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

const BASE_URL = "https://api.weather.gov/alerts/active";
const DEFAULT_INTERVAL_MS = 60_000;

// HTTP status codes we treat as transient (worth retrying with backoff)
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const BASE_RETRY_MS = 15_000;
const MAX_RETRY_MS = 5 * 60_000;

function eventUrl(eventType: string): string {
  return `${BASE_URL}?event=${encodeURIComponent(eventType)}`;
}

type UrlState = {
  etag: string | null;
  lastFeatures: NwsFeature[];
};

export type PollOptions = {
  intervalMs?: number;
  onWarnings: (warnings: WeatherWarning[]) => void;
  onError?: (err: Error) => void;
};

export function startPoller(options: PollOptions): () => void {
  const { intervalMs = DEFAULT_INTERVAL_MS, onWarnings, onError } = options;

  const urlStates = new Map<string, UrlState>(
    SUPPORTED_EVENT_TYPES.map((t) => [eventUrl(t), { etag: null, lastFeatures: [] }]),
  );

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let consecutiveErrors = 0;

  async function fetchOne(url: string, state: UrlState): Promise<NwsFeature[]> {
    const headers: Record<string, string> = { Accept: "application/geo+json" };
    if (state.etag) headers["If-None-Match"] = state.etag;

    const res = await fetch(url, { headers });

    if (res.status === 304) return state.lastFeatures;

    if (!res.ok) {
      if (TRANSIENT_STATUSES.has(res.status)) throw new Error(`NWS API returned ${res.status}`);
      throw new Error(`NWS API returned ${res.status}`);
    }

    const newEtag = res.headers.get("ETag");
    if (newEtag) state.etag = newEtag;

    const raw: unknown = await res.json();
    const collection = NwsFeatureCollectionSchema.parse(raw);
    state.lastFeatures = collection.features;
    return collection.features;
  }

  async function poll(): Promise<void> {
    let nextDelay = intervalMs;
    try {
      const entries = [...urlStates.entries()];
      const results = await Promise.all(entries.map(([url, state]) => fetchOne(url, state)));
      const allFeatures = results.flat();
      consecutiveErrors = 0;
      onWarnings(dedup(allFeatures.map(normalizeFeature)));
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && err.message.includes("NWS API"))) {
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
