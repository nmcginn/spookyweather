export type { GeoJsonPolygon, WeatherWarning, TornadoWarning } from "./types.ts";
export { NwsFeatureCollectionSchema, NwsFeatureSchema } from "./schema.ts";
export type { NwsFeature, NwsFeatureCollection } from "./schema.ts";
export { normalizeFeature } from "./normalize.ts";
export { dedup, vtecKey } from "./dedup.ts";
export { startPoller, SUPPORTED_EVENT_TYPES } from "./poller.ts";
export type { PollOptions, SupportedEventType } from "./poller.ts";
