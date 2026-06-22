import type { WeatherWarning } from "../nws/types.ts";

export type WarningSeverity = "CATASTROPHIC" | "CONSIDERABLE" | "OBSERVED" | "STANDARD";

// Per-event-type color palettes keyed by severity tier
const EVENT_COLORS: Record<string, Record<WarningSeverity, string>> = {
  "Tornado Warning": {
    STANDARD: "#FF4400",
    OBSERVED: "#FF0000",
    CONSIDERABLE: "#8B0000",
    CATASTROPHIC: "#FF69B4",
  },
  "Severe Thunderstorm Warning": {
    STANDARD: "#DAA520",
    OBSERVED: "#DAA520",
    CONSIDERABLE: "#FF8C00",
    CATASTROPHIC: "#FF8C00",
  },
  "Flash Flood Warning": {
    STANDARD: "#00AA00",
    OBSERVED: "#00AA00",
    CONSIDERABLE: "#006400",
    CATASTROPHIC: "#006400",
  },
};

const DEFAULT_COLORS: Record<WarningSeverity, string> = {
  STANDARD: "#888888",
  OBSERVED: "#888888",
  CONSIDERABLE: "#555555",
  CATASTROPHIC: "#555555",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  "Tornado Warning": "TORNADO WARNING",
  "Severe Thunderstorm Warning": "SEVERE THUNDERSTORM WARNING",
  "Flash Flood Warning": "FLASH FLOOD WARNING",
};

// Backward-compatible severity label overrides for tornados
const TORNADO_SEVERITY_LABELS: Record<WarningSeverity, string> = {
  STANDARD: "TORNADO WARNING",
  OBSERVED: "TORNADO WARNING (OBSERVED)",
  CONSIDERABLE: "PDS TORNADO WARNING",
  CATASTROPHIC: "TORNADO EMERGENCY",
};

const TSTORM_SEVERITY_LABELS: Record<WarningSeverity, string> = {
  STANDARD: "SEVERE THUNDERSTORM WARNING",
  OBSERVED: "SEVERE THUNDERSTORM WARNING",
  CONSIDERABLE: "DESTRUCTIVE TSTORM WARNING",
  CATASTROPHIC: "DESTRUCTIVE TSTORM WARNING",
};

const FLOOD_SEVERITY_LABELS: Record<WarningSeverity, string> = {
  STANDARD: "FLASH FLOOD WARNING",
  OBSERVED: "FLASH FLOOD WARNING",
  CONSIDERABLE: "FLASH FLOOD EMERGENCY",
  CATASTROPHIC: "FLASH FLOOD EMERGENCY",
};

const EVENT_SEVERITY_LABELS: Record<string, Record<WarningSeverity, string>> = {
  "Tornado Warning": TORNADO_SEVERITY_LABELS,
  "Severe Thunderstorm Warning": TSTORM_SEVERITY_LABELS,
  "Flash Flood Warning": FLOOD_SEVERITY_LABELS,
};

// Keep for backward compat (tornado-only callers)
export const SEVERITY_COLORS = EVENT_COLORS["Tornado Warning"] as Record<WarningSeverity, string>;
export const SEVERITY_LABELS = TORNADO_SEVERITY_LABELS;

export type WarningProperties = {
  id: string;
  eventType: string;
  severity: WarningSeverity;
  color: string;
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

export function warningSeverity(w: WeatherWarning): WarningSeverity {
  if (w.damageThreat === "CATASTROPHIC") return "CATASTROPHIC";
  if (w.damageThreat === "CONSIDERABLE" || w.damageThreat === "DESTRUCTIVE") return "CONSIDERABLE";
  if (w.detection === "OBSERVED") return "OBSERVED";
  return "STANDARD";
}

export function warningColor(w: WeatherWarning): string {
  const palette = EVENT_COLORS[w.eventType] ?? DEFAULT_COLORS;
  return palette[warningSeverity(w)];
}

export function warningLabel(w: WeatherWarning): string {
  const sev = warningSeverity(w);
  const labels = EVENT_SEVERITY_LABELS[w.eventType];
  return labels ? labels[sev] : (EVENT_TYPE_LABELS[w.eventType] ?? w.eventType.toUpperCase());
}

export function warningToFeature(w: WeatherWarning): WarningFeature | null {
  if (!w.polygon) return null;
  return {
    type: "Feature",
    id: w.id,
    geometry: w.polygon,
    properties: {
      id: w.id,
      eventType: w.eventType,
      severity: warningSeverity(w),
      color: warningColor(w),
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

export function warningsToGeoJSON(warnings: WeatherWarning[]): WarningFeatureCollection {
  return {
    type: "FeatureCollection",
    features: warnings.flatMap((w) => {
      const f = warningToFeature(w);
      return f ? [f] : [];
    }),
  };
}
