import { describe, expect, it } from "vitest";
import fixtureData from "./__fixtures__/alerts-active.json";
import { NwsFeatureCollectionSchema, dedup, normalizeFeature, vtecKey } from "./nws/index.ts";
import type { WeatherWarning } from "./nws/index.ts";

// --- Schema parsing ---

describe("NwsFeatureCollectionSchema", () => {
  it("parses the fixture successfully", () => {
    const result = NwsFeatureCollectionSchema.safeParse(fixtureData);
    expect(result.success).toBe(true);
  });

  it("parses the correct number of features", () => {
    const collection = NwsFeatureCollectionSchema.parse(fixtureData);
    expect(collection.features).toHaveLength(5);
  });

  it("rejects missing required fields", () => {
    const bad = { type: "FeatureCollection", features: [{ type: "Feature", geometry: null }] };
    expect(NwsFeatureCollectionSchema.safeParse(bad).success).toBe(false);
  });
});

// --- normalizeFeature ---

describe("normalizeFeature", () => {
  const collection = NwsFeatureCollectionSchema.parse(fixtureData);

  it("maps all required fields from the first feature", () => {
    const w = normalizeFeature(collection.features[0]!);
    expect(w.id).toBe("urn:oid:2.49.0.1.840.0.a1b2c3d4");
    expect(w.senderName).toBe("NWS Springfield MO");
    expect(w.counties).toBe("Greene; Christian; Webster");
    expect(w.messageType).toBe("Alert");
    expect(w.sent).toBe("2024-05-01T20:00:00+00:00");
    expect(w.expires).toBe("2024-05-01T20:45:00+00:00");
  });

  it("extracts eventType from properties.event", () => {
    const w = normalizeFeature(collection.features[0]!);
    expect(w.eventType).toBe("Tornado Warning");
  });

  it("extracts polygon geometry", () => {
    const w = normalizeFeature(collection.features[0]!);
    expect(w.polygon).not.toBeNull();
    expect(w.polygon?.type).toBe("Polygon");
    expect(w.polygon?.coordinates).toHaveLength(1);
  });

  it("extracts RADAR INDICATED detection", () => {
    const w = normalizeFeature(collection.features[0]!);
    expect(w.detection).toBe("RADAR INDICATED");
    expect(w.damageThreat).toBeNull();
  });

  it("extracts OBSERVED detection", () => {
    const w = normalizeFeature(collection.features[1]!);
    expect(w.detection).toBe("OBSERVED");
    expect(w.damageThreat).toBeNull();
  });

  it("extracts CONSIDERABLE damage threat (PDS)", () => {
    const w = normalizeFeature(collection.features[2]!);
    expect(w.damageThreat).toBe("CONSIDERABLE");
  });

  it("extracts CATASTROPHIC damage threat (Tornado Emergency)", () => {
    const w = normalizeFeature(collection.features[3]!);
    expect(w.detection).toBe("OBSERVED");
    expect(w.damageThreat).toBe("CATASTROPHIC");
    expect(w.messageType).toBe("Update");
    expect(w.vtec).toBe("/O.CON.KOUN.TO.W.0048.240501T2015Z-240501T2130Z/");
  });

  it("handles null geometry", () => {
    const w = normalizeFeature(collection.features[4]!);
    expect(w.polygon).toBeNull();
  });

  it("handles null instruction", () => {
    const w = normalizeFeature(collection.features[4]!);
    expect(w.instruction).toBeNull();
  });

  it("extracts motion description", () => {
    const w = normalizeFeature(collection.features[0]!);
    expect(w.motion).toBe("2024-05-01T20:00:00-00:00...045DEG...45KT...37.12,-93.25");
  });

  it("returns null motion when absent", () => {
    const w = normalizeFeature(collection.features[4]!);
    expect(w.motion).toBeNull();
  });

  it("returns null headline when absent", () => {
    const collection2 = NwsFeatureCollectionSchema.parse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: null,
          properties: {
            id: "test-id",
            event: "Tornado Warning",
            areaDesc: "Test County",
            sent: "2024-05-01T20:00:00+00:00",
            expires: "2024-05-01T21:00:00+00:00",
            messageType: "Alert",
            senderName: "NWS Test Office",
            description: "Test description.",
            parameters: { VTEC: ["/O.NEW.KTEST.TO.W.0001.240501T2000Z-240501T2100Z/"] },
          },
        },
      ],
    });
    const w = normalizeFeature(collection2.features[0]!);
    expect(w.headline).toBeNull();
  });
});

// --- vtecKey ---

describe("vtecKey", () => {
  it("extracts office.phenomena.significance.ETN", () => {
    expect(vtecKey("/O.NEW.KSGF.TO.W.0023.240501T2000Z-240501T2045Z/")).toBe("KSGF.TO.W.0023");
  });

  it("handles CON action", () => {
    expect(vtecKey("/O.CON.KOUN.TO.W.0048.240501T2015Z-240501T2130Z/")).toBe("KOUN.TO.W.0048");
  });

  it("handles CAN action", () => {
    expect(vtecKey("/O.CAN.KSGF.TO.W.0023.240501T2000Z-240501T2045Z/")).toBe("KSGF.TO.W.0023");
  });

  it("returns null for strings with fewer than 6 segments", () => {
    expect(vtecKey("O.NEW.KSGF.TO")).toBeNull();
    expect(vtecKey("invalid")).toBeNull();
  });
});

// --- dedup ---

const FUTURE = "2099-12-31T23:59:59+00:00";
const PAST = "2000-01-01T00:00:00+00:00";
const NOW = new Date("2024-05-01T21:00:00Z");

function makeWarning(overrides: Partial<WeatherWarning>): WeatherWarning {
  return {
    id: "test-id",
    eventType: "Tornado Warning",
    vtec: "/O.NEW.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
    messageType: "Alert",
    polygon: null,
    counties: "Test County",
    sent: "2024-05-01T20:00:00+00:00",
    expires: FUTURE,
    detection: null,
    damageThreat: null,
    motion: null,
    headline: null,
    description: "Test",
    instruction: null,
    senderName: "NWS Test",
    ...overrides,
  };
}

describe("dedup", () => {
  it("passes through a single active warning", () => {
    const w = makeWarning({});
    expect(dedup([w], NOW)).toHaveLength(1);
  });

  it("keeps only the latest update for the same VTEC event", () => {
    const alert = makeWarning({ sent: "2024-05-01T20:00:00+00:00", id: "a" });
    const update = makeWarning({
      sent: "2024-05-01T20:15:00+00:00",
      id: "b",
      vtec: "/O.CON.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
      messageType: "Update",
    });
    const result = dedup([alert, update], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("b");
  });

  it("removes a VTEC event when a Cancel is the latest message", () => {
    const alert = makeWarning({ sent: "2024-05-01T20:00:00+00:00", id: "a" });
    const cancel = makeWarning({
      sent: "2024-05-01T20:20:00+00:00",
      id: "c",
      vtec: "/O.CAN.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
      messageType: "Cancel",
    });
    expect(dedup([alert, cancel], NOW)).toHaveLength(0);
  });

  it("does not remove a VTEC event when Cancel is older than Update", () => {
    const cancel = makeWarning({
      sent: "2024-05-01T20:05:00+00:00",
      id: "c",
      vtec: "/O.CAN.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
      messageType: "Cancel",
    });
    const update = makeWarning({
      sent: "2024-05-01T20:20:00+00:00",
      id: "u",
      vtec: "/O.CON.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/",
      messageType: "Update",
    });
    const result = dedup([cancel, update], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("u");
  });

  it("filters out expired warnings", () => {
    const expired = makeWarning({ expires: PAST });
    expect(dedup([expired], NOW)).toHaveLength(0);
  });

  it("keeps active warnings while filtering expired ones", () => {
    const active = makeWarning({ id: "active", expires: FUTURE });
    const expired = makeWarning({
      id: "expired",
      expires: PAST,
      vtec: "/O.NEW.KSGF.TO.W.0002.240501T2000Z-240501T2100Z/",
    });
    const result = dedup([active, expired], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("active");
  });

  it("handles warnings with null VTEC as unkeyed (all kept)", () => {
    const a = makeWarning({ id: "a", vtec: null });
    const b = makeWarning({ id: "b", vtec: null });
    expect(dedup([a, b], NOW)).toHaveLength(2);
  });

  it("keeps distinct VTEC events separately", () => {
    const a = makeWarning({ id: "a", vtec: "/O.NEW.KSGF.TO.W.0001.240501T2000Z-240501T2100Z/" });
    const b = makeWarning({ id: "b", vtec: "/O.NEW.KSGF.TO.W.0002.240501T2000Z-240501T2100Z/" });
    expect(dedup([a, b], NOW)).toHaveLength(2);
  });

  it("produces correct results when processing the fixture", () => {
    const collection = NwsFeatureCollectionSchema.parse(fixtureData);
    const warnings = collection.features.map(normalizeFeature);
    // All fixture warnings are in the past — dedup with a past "now" keeps them all
    const pastNow = new Date("2024-05-01T19:00:00Z");
    const result = dedup(warnings, pastNow);
    expect(result).toHaveLength(5);
  });
});
