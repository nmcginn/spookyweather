import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserLocation } from "./location.ts";

describe("fetchUserLocation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns lat/lng on a successful response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ latitude: 37.5, longitude: -95.2 }),
    } as Response);

    expect(await fetchUserLocation()).toEqual({ lat: 37.5, lng: -95.2 });
  });

  it("returns null on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    expect(await fetchUserLocation()).toBeNull();
  });

  it("returns null when coordinates are missing (e.g. reserved IP)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ error: true, reason: "Reserved IP Address" }),
    } as Response);

    expect(await fetchUserLocation()).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"));

    expect(await fetchUserLocation()).toBeNull();
  });

  it("returns null on abort (timeout)", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("aborted", "AbortError"));

    expect(await fetchUserLocation()).toBeNull();
  });
});
