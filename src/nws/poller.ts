import { dedup } from "./dedup.ts";
import { normalizeFeature } from "./normalize.ts";
import { NwsFeatureCollectionSchema } from "./schema.ts";
import type { TornadoWarning } from "./types.ts";

const DEFAULT_URL = "https://api.weather.gov/alerts/active?event=Tornado%20Warning";
const DEFAULT_INTERVAL_MS = 60_000;

export type PollOptions = {
  url?: string;
  intervalMs?: number;
  onWarnings: (warnings: TornadoWarning[]) => void;
  onError?: (err: Error) => void;
};

export function startPoller(options: PollOptions): () => void {
  const { url = DEFAULT_URL, intervalMs = DEFAULT_INTERVAL_MS, onWarnings, onError } = options;
  let etag: string | null = null;
  let lastResult: TornadoWarning[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  async function poll(): Promise<void> {
    try {
      const headers: Record<string, string> = { Accept: "application/geo+json" };
      if (etag) headers["If-None-Match"] = etag;

      const res = await fetch(url, { headers });

      if (res.status === 304) {
        onWarnings(lastResult);
      } else if (!res.ok) {
        throw new Error(`NWS API returned ${res.status}`);
      } else {
        const newEtag = res.headers.get("ETag");
        if (newEtag) etag = newEtag;

        const raw: unknown = await res.json();
        const collection = NwsFeatureCollectionSchema.parse(raw);
        lastResult = dedup(collection.features.map(normalizeFeature));
        onWarnings(lastResult);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!stopped) {
        timer = setTimeout(() => void poll(), intervalMs);
      }
    }
  }

  void poll();

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  };
}
