import type { NwsFeature } from "./schema.ts";
import type { GeoJsonPolygon, WeatherWarning } from "./types.ts";

export function normalizeFeature(feature: NwsFeature): WeatherWarning {
  const p = feature.properties;
  const params = p.parameters;

  const vtec = params?.VTEC?.[0] ?? null;
  const motion = params?.eventMotionDescription?.[0] ?? null;

  const detection = params?.tornadoDetection?.[0] ?? params?.flashFloodDetection?.[0] ?? null;

  const damageThreat =
    params?.tornadoDamageThreat?.[0] ??
    params?.thunderstormDamageThreat?.[0] ??
    params?.flashFloodDamageThreat?.[0] ??
    null;

  const polygon: GeoJsonPolygon | null =
    feature.geometry?.type === "Polygon"
      ? { type: "Polygon", coordinates: feature.geometry.coordinates }
      : null;

  return {
    id: p.id,
    eventType: p.event,
    vtec,
    messageType: p.messageType,
    polygon,
    counties: p.areaDesc,
    sent: p.sent,
    expires: p.expires,
    detection,
    damageThreat,
    motion,
    headline: p.headline ?? null,
    description: p.description,
    instruction: p.instruction ?? null,
    senderName: p.senderName,
  };
}
