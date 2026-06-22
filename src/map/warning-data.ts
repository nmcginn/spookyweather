import type { TornadoWarning } from "../nws/types.ts";

export type WarningSeverity = "CATASTROPHIC" | "CONSIDERABLE" | "OBSERVED" | "STANDARD";

export const SEVERITY_COLORS: Record<WarningSeverity, string> = {
  STANDARD: "#FF4400",
  OBSERVED: "#FF0000",
  CONSIDERABLE: "#8B0000",
  CATASTROPHIC: "#FF69B4",
};

export const SEVERITY_LABELS: Record<WarningSeverity, string> = {
  STANDARD: "TORNADO WARNING",
  OBSERVED: "TORNADO WARNING (OBSERVED)",
  CONSIDERABLE: "PDS TORNADO WARNING",
  CATASTROPHIC: "TORNADO EMERGENCY",
};

export type WarningProperties = {
  id: string;
  severity: WarningSeverity;
  counties: string;
  expires: string;
  senderName: string;
  headline: string | null;
  detection: string | null;
  damageThreat: string | null;
  description: string;
  instruction: string | null;
};

export type WarningFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: WarningProperties;
};

export type WarningFeatureCollection = {
  type: "FeatureCollection";
  features: WarningFeature[];
};

export function warningSeverity(w: TornadoWarning): WarningSeverity {
  if (w.damageThreat === "CATASTROPHIC") return "CATASTROPHIC";
  if (w.damageThreat === "CONSIDERABLE") return "CONSIDERABLE";
  if (w.detection === "OBSERVED") return "OBSERVED";
  return "STANDARD";
}

export function warningToFeature(w: TornadoWarning): WarningFeature | null {
  if (!w.polygon) return null;
  return {
    type: "Feature",
    id: w.id,
    geometry: w.polygon,
    properties: {
      id: w.id,
      severity: warningSeverity(w),
      counties: w.counties,
      expires: w.expires,
      senderName: w.senderName,
      headline: w.headline,
      detection: w.detection,
      damageThreat: w.damageThreat,
      description: w.description,
      instruction: w.instruction,
    },
  };
}

export function warningsToGeoJSON(warnings: TornadoWarning[]): WarningFeatureCollection {
  return {
    type: "FeatureCollection",
    features: warnings.flatMap((w) => {
      const f = warningToFeature(w);
      return f ? [f] : [];
    }),
  };
}
