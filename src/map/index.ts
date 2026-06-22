import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { startPoller } from "../nws/poller.ts";
import type { TornadoWarning } from "../nws/types.ts";
import type { GeoJsonPolygon } from "../nws/types.ts";
import { createRadarControl, setupRadarLayer } from "./radar.ts";
import { createSpcControl } from "./spc-control.ts";
import { FILL_LAYER_ID, setupWarningLayers, updateWarnings } from "./warnings.ts";

const CONUS_CENTER: [number, number] = [-96, 39];
const CONUS_ZOOM = 4;
const BASE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export type MapControls = {
  updateWarnings: (warnings: TornadoWarning[]) => void;
  flyToWarning: (warning: TornadoWarning) => void;
};

export type MapOptions = {
  onWarningSelect?: (id: string) => void;
  onWarningsUpdate?: (warnings: TornadoWarning[]) => void;
  onSpcToggle?: () => void;
};

function polygonBounds(polygon: GeoJsonPolygon): [[number, number], [number, number]] {
  const coords = polygon.coordinates.flat();
  const lngs = coords.map((c) => c[0] as number);
  const lats = coords.map((c) => c[1] as number);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function fitToWarnings(map: maplibregl.Map, warnings: TornadoWarning[]): void {
  const withPolygon = warnings.filter(
    (w): w is TornadoWarning & { polygon: GeoJsonPolygon } => w.polygon !== null,
  );
  if (withPolygon.length === 0) return;

  const combined = withPolygon.reduce<[[number, number], [number, number]]>(
    (acc, w) => {
      const b = polygonBounds(w.polygon);
      return [
        [Math.min(acc[0][0], b[0][0]), Math.min(acc[0][1], b[0][1])],
        [Math.max(acc[1][0], b[1][0]), Math.max(acc[1][1], b[1][1])],
      ];
    },
    [
      [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    ],
  );

  map.fitBounds(combined, {
    padding: { top: 80, right: 80, bottom: 120, left: 80 },
    maxZoom: 8,
    duration: 1200,
  });
}

export function initMap(container: HTMLElement, options: MapOptions = {}): MapControls {
  const map = new maplibregl.Map({
    container,
    style: BASE_STYLE,
    center: CONUS_CENTER,
    zoom: CONUS_ZOOM,
    maxZoom: 14,
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }),
    "top-right",
  );

  map.on("load", () => {
    setupWarningLayers(map, options.onWarningSelect);

    // Radar layer sits below the warning polygons
    const radarControls = setupRadarLayer(map, FILL_LAYER_ID);
    map.addControl(createRadarControl(radarControls), "top-left");

    if (options.onSpcToggle) {
      map.addControl(createSpcControl(options.onSpcToggle), "top-left");
    }

    let initialFitDone = false;

    startPoller({
      onWarnings: (warnings) => {
        updateWarnings(map, warnings);
        options.onWarningsUpdate?.(warnings);
        if (!initialFitDone) {
          initialFitDone = true;
          fitToWarnings(map, warnings);
        }
      },
      onError: (err) => console.error("NWS poller error:", err),
    });
  });

  return {
    updateWarnings: (warnings) => updateWarnings(map, warnings),
    flyToWarning: (warning) => {
      if (!warning.polygon) return;
      const bounds = polygonBounds(warning.polygon);
      map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 800 });
    },
  };
}
