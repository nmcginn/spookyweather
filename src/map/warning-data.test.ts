import { describe, expect, it } from "vitest";
import type { WeatherWarning } from "../nws/types.ts";
import {
  warningColor,
  warningLabel,
  warningSeverity,
  warningToFeature,
  warningsToGeoJSON,
} from "./warning-data.ts";

const POLYGON = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-93.5, 37.0],
      [-93.0, 37.0],
      [-93.0, 37.5],
      [-93.5, 37.5],
      [-93.5, 37.0],
    ],
  ],
};

const FUTURE = "2099-12-31T23:59:59+00:00";

function makeWarning(overrides: Partial<WeatherWarning>): WeatherWarning {
  return {
    id: "test-id",
    eventType: "Tornado Warning",
    vtec: "/O.NEW.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
    messageType: "Alert",
    polygon: POLYGON,
    counties: "Test County",
    sent: "2024-05-01T20:00:00+00:00",
    expires: FUTURE,
    detection: null,
    damageThreat: null,
    motion: null,
    headline: null,
    description: "A tornado warning has been issued.",
    instruction: "Take shelter immediately.",
    senderName: "NWS Test Office",
    ...overrides,
  };
}

// --- warningSeverity ---

describe("warningSeverity", () => {
  it("returns STANDARD for radar-indicated with no damage threat", () => {
    expect(warningSeverity(makeWarning({ detection: "RADAR INDICATED" }))).toBe("STANDARD");
  });

  it("returns STANDARD when detection and damageThreat are both null", () => {
    expect(warningSeverity(makeWarning({}))).toBe("STANDARD");
  });

  it("returns OBSERVED for confirmed tornado with no damage threat", () => {
    expect(warningSeverity(makeWarning({ detection: "OBSERVED" }))).toBe("OBSERVED");
  });

  it("returns CONSIDERABLE for PDS warnings regardless of detection", () => {
    expect(warningSeverity(makeWarning({ damageThreat: "CONSIDERABLE" }))).toBe("CONSIDERABLE");
    expect(
      warningSeverity(makeWarning({ detection: "OBSERVED", damageThreat: "CONSIDERABLE" })),
    ).toBe("CONSIDERABLE");
  });

  it("returns CONSIDERABLE for DESTRUCTIVE thunderstorm threats", () => {
    expect(
      warningSeverity(
        makeWarning({ eventType: "Severe Thunderstorm Warning", damageThreat: "DESTRUCTIVE" }),
      ),
    ).toBe("CONSIDERABLE");
  });

  it("returns CATASTROPHIC for tornado emergency regardless of detection", () => {
    expect(warningSeverity(makeWarning({ damageThreat: "CATASTROPHIC" }))).toBe("CATASTROPHIC");
    expect(
      warningSeverity(makeWarning({ detection: "OBSERVED", damageThreat: "CATASTROPHIC" })),
    ).toBe("CATASTROPHIC");
  });

  it("damageThreat takes precedence over detection", () => {
    // CATASTROPHIC > OBSERVED detection
    expect(
      warningSeverity(makeWarning({ detection: "OBSERVED", damageThreat: "CATASTROPHIC" })),
    ).toBe("CATASTROPHIC");
  });
});

// --- warningColor ---

describe("warningColor", () => {
  it("returns tornado colors for Tornado Warning", () => {
    expect(warningColor(makeWarning({}))).toBe("#FF4400");
    expect(warningColor(makeWarning({ damageThreat: "CATASTROPHIC" }))).toBe("#FF69B4");
  });

  it("returns amber colors for Severe Thunderstorm Warning", () => {
    expect(warningColor(makeWarning({ eventType: "Severe Thunderstorm Warning" }))).toBe("#DAA520");
    expect(
      warningColor(
        makeWarning({ eventType: "Severe Thunderstorm Warning", damageThreat: "DESTRUCTIVE" }),
      ),
    ).toBe("#FF8C00");
  });

  it("returns green colors for Flash Flood Warning", () => {
    expect(warningColor(makeWarning({ eventType: "Flash Flood Warning" }))).toBe("#00AA00");
  });

  it("returns a fallback color for unknown event types", () => {
    expect(warningColor(makeWarning({ eventType: "Unknown Event" }))).toBe("#888888");
  });
});

// --- warningLabel ---

describe("warningLabel", () => {
  it("returns TORNADO WARNING for standard tornado warning", () => {
    expect(warningLabel(makeWarning({}))).toBe("TORNADO WARNING");
  });

  it("returns TORNADO EMERGENCY for catastrophic tornado warning", () => {
    expect(warningLabel(makeWarning({ damageThreat: "CATASTROPHIC" }))).toBe("TORNADO EMERGENCY");
  });

  it("returns DESTRUCTIVE label for destructive thunderstorm", () => {
    expect(
      warningLabel(
        makeWarning({ eventType: "Severe Thunderstorm Warning", damageThreat: "DESTRUCTIVE" }),
      ),
    ).toBe("DESTRUCTIVE TSTORM WARNING");
  });

  it("returns FLASH FLOOD WARNING for standard flood", () => {
    expect(warningLabel(makeWarning({ eventType: "Flash Flood Warning" }))).toBe(
      "FLASH FLOOD WARNING",
    );
  });
});

// --- warningToFeature ---

describe("warningToFeature", () => {
  it("returns null when polygon is null", () => {
    expect(warningToFeature(makeWarning({ polygon: null }))).toBeNull();
  });

  it("returns a Feature with correct structure for a warning with a polygon", () => {
    const feature = warningToFeature(makeWarning({}));
    expect(feature).not.toBeNull();
    expect(feature?.type).toBe("Feature");
    expect(feature?.geometry.type).toBe("Polygon");
    expect(feature?.geometry.coordinates).toEqual(POLYGON.coordinates);
  });

  it("sets feature id to the warning id", () => {
    const feature = warningToFeature(makeWarning({ id: "my-warning-id" }));
    expect(feature?.id).toBe("my-warning-id");
  });

  it("sets severity in properties", () => {
    const feature = warningToFeature(makeWarning({ damageThreat: "CATASTROPHIC" }));
    expect(feature?.properties.severity).toBe("CATASTROPHIC");
  });

  it("sets eventType in properties", () => {
    const feature = warningToFeature(makeWarning({ eventType: "Flash Flood Warning" }));
    expect(feature?.properties.eventType).toBe("Flash Flood Warning");
  });

  it("sets precomputed color in properties", () => {
    const feature = warningToFeature(makeWarning({ eventType: "Flash Flood Warning" }));
    expect(feature?.properties.color).toBe("#00AA00");
  });

  it("copies core fields to properties", () => {
    const w = makeWarning({});
    const feature = warningToFeature(w);
    expect(feature?.properties.counties).toBe(w.counties);
    expect(feature?.properties.expires).toBe(w.expires);
    expect(feature?.properties.senderName).toBe(w.senderName);
    expect(feature?.properties.description).toBe(w.description);
  });

  it("preserves null optional fields in properties", () => {
    const feature = warningToFeature(makeWarning({ headline: null, instruction: null }));
    expect(feature?.properties.headline).toBeNull();
    expect(feature?.properties.instruction).toBeNull();
  });
});

// --- warningsToGeoJSON ---

describe("warningsToGeoJSON", () => {
  it("returns an empty FeatureCollection for no warnings", () => {
    const result = warningsToGeoJSON([]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  it("omits warnings without a polygon", () => {
    const result = warningsToGeoJSON([
      makeWarning({ id: "has-polygon" }),
      makeWarning({ id: "no-polygon", polygon: null }),
    ]);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]!.id).toBe("has-polygon");
  });

  it("includes all warnings that have polygons", () => {
    const result = warningsToGeoJSON([makeWarning({ id: "a" }), makeWarning({ id: "b" })]);
    expect(result.features).toHaveLength(2);
  });

  it("produces valid GeoJSON FeatureCollection structure", () => {
    const result = warningsToGeoJSON([makeWarning({})]);
    expect(result.type).toBe("FeatureCollection");
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features[0]!.type).toBe("Feature");
    expect(result.features[0]!.geometry.type).toBe("Polygon");
  });
});
