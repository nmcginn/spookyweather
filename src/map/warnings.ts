import maplibregl from "maplibre-gl";
import type { TornadoWarning } from "../nws/types.ts";
import { type WarningSeverity, warningsToGeoJSON } from "./warning-data.ts";

const SOURCE_ID = "tornado-warnings";
const FILL_LAYER_ID = "tornado-warnings-fill";
const LINE_LAYER_ID = "tornado-warnings-line";

// Colors per severity level (fill and stroke share the same palette)
const SEVERITY_COLORS: Record<WarningSeverity, string> = {
  STANDARD: "#FF4400", // radar-indicated — red-orange
  OBSERVED: "#FF0000", // confirmed tornado — pure red
  CONSIDERABLE: "#8B0000", // PDS — dark maroon (escalated)
  CATASTROPHIC: "#FF69B4", // tornado emergency — hot pink (distinctly different)
};

const SEVERITY_LABELS: Record<WarningSeverity, string> = {
  STANDARD: "TORNADO WARNING",
  OBSERVED: "TORNADO WARNING (OBSERVED)",
  CONSIDERABLE: "PDS TORNADO WARNING",
  CATASTROPHIC: "TORNADO EMERGENCY",
};

// MapLibre match expression driving fill/line color from the "severity" feature property.
// Cast required because ExpressionSpecification is a complex internal union type not
// re-exported from maplibre-gl.
const COLOR_EXPR = [
  "match",
  ["get", "severity"],
  "CATASTROPHIC",
  SEVERITY_COLORS.CATASTROPHIC,
  "CONSIDERABLE",
  SEVERITY_COLORS.CONSIDERABLE,
  "OBSERVED",
  SEVERITY_COLORS.OBSERVED,
  SEVERITY_COLORS.STANDARD,
] as unknown as maplibregl.AddLayerObject;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExpiry(isoString: string): string {
  const minsLeft = Math.round((new Date(isoString).getTime() - Date.now()) / 60_000);
  return minsLeft > 0 ? `Expires in ${minsLeft} min` : "Expired";
}

function buildPopupHtml(props: {
  severity: WarningSeverity;
  senderName: string;
  counties: string;
  expires: string;
  description: string;
}): string {
  const label = SEVERITY_LABELS[props.severity];
  return `
<div class="warning-popup">
  <div class="warning-popup__severity warning-popup__severity--${props.severity.toLowerCase()}">${escapeHtml(label)}</div>
  <div class="warning-popup__sender">${escapeHtml(props.senderName)}</div>
  <div class="warning-popup__counties">${escapeHtml(props.counties)}</div>
  <div class="warning-popup__expiry">${escapeHtml(formatExpiry(props.expires))}</div>
  <div class="warning-popup__description">${escapeHtml(props.description)}</div>
</div>`.trim();
}

export function setupWarningLayers(map: maplibregl.Map): void {
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": COLOR_EXPR,
      "fill-opacity": 0.35,
    },
  } as unknown as maplibregl.AddLayerObject);

  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": COLOR_EXPR,
      "line-width": 2,
    },
  } as unknown as maplibregl.AddLayerObject);

  map.on("click", FILL_LAYER_ID, (e) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const props = feature.properties as {
      severity: WarningSeverity;
      senderName: string;
      counties: string;
      expires: string;
      description: string;
    };

    new maplibregl.Popup({ maxWidth: "340px" })
      .setLngLat(e.lngLat)
      .setHTML(buildPopupHtml(props))
      .addTo(map);
  });

  map.on("mouseenter", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
}

export function updateWarnings(map: maplibregl.Map, warnings: TornadoWarning[]): void {
  const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  // Cast required: our WarningFeatureCollection is structurally GeoJSON but uses our own types.
  source.setData(warningsToGeoJSON(warnings) as unknown as GeoJSON.GeoJSON);
}
