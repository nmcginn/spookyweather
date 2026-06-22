import type maplibregl from "maplibre-gl";
import type { WeatherWarning } from "../nws/types.ts";
import { warningsToGeoJSON } from "./warning-data.ts";

const SOURCE_ID = "weather-warnings";
export const FILL_LAYER_ID = "weather-warnings-fill";
const LINE_LAYER_ID = "weather-warnings-line";

export function setupWarningLayers(map: maplibregl.Map, onSelect?: (id: string) => void): void {
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.35,
    },
  } as unknown as maplibregl.AddLayerObject);

  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
    },
  } as unknown as maplibregl.AddLayerObject);

  map.on("click", FILL_LAYER_ID, (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = (feature.properties as { id: string }).id;
    onSelect?.(id);
  });

  map.on("mouseenter", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
}

export function updateWarnings(map: maplibregl.Map, warnings: WeatherWarning[]): void {
  const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(warningsToGeoJSON(warnings) as unknown as GeoJSON.GeoJSON);
}
