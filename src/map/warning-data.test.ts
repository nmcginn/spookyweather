import { describe, expect, it } from "vitest";
import type { TornadoWarning } from "../nws/types.ts";
import { warningSeverity, warningToFeature, warningsToGeoJSON } from "./warning-data.ts";

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

function makeWarning(overrides: Partial<TornadoWarning>): TornadoWarning {
  return {
    id: "test-id",
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
