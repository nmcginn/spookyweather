import type { NwsFeature } from "./schema.ts";
import type { GeoJsonPolygon, TornadoWarning } from "./types.ts";

export function normalizeFeature(feature: NwsFeature): TornadoWarning {
  const p = feature.properties;
  const params = p.parameters;

  const vtec = params?.VTEC?.[0] ?? null;
  const detectionRaw = params?.tornadoDetection?.[0] ?? null;
  const damageThreatRaw = params?.tornadoDamageThreat?.[0] ?? null;

  const detection =
    detectionRaw === "RADAR INDICATED" || detectionRaw === "OBSERVED" ? detectionRaw : null;

  const damageThreat =
    damageThreatRaw === "CONSIDERABLE" || damageThreatRaw === "CATASTROPHIC"
      ? damageThreatRaw
      : null;

  const polygon: GeoJsonPolygon | null =
    feature.geometry?.type === "Polygon"
      ? { type: "Polygon", coordinates: feature.geometry.coordinates }
      : null;

  return {
    id: p.id,
    vtec,
    messageType: p.messageType,
    polygon,
    counties: p.areaDesc,
    sent: p.sent,
    expires: p.expires,
    detection,
    damageThreat,
    motion: params?.eventMotionDescription?.[0] ?? null,
    headline: p.headline ?? null,
    description: p.description,
    instruction: p.instruction ?? null,
    senderName: p.senderName,
  };
}
