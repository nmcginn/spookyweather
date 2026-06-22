import "./style.css";
import type { MapControls } from "./map/index.ts";
import { createWarningSheet } from "./ui/warning-sheet.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app element not found");

const mapContainer = document.createElement("div");
mapContainer.id = "map";
app.appendChild(mapContainer);

let mapControls: MapControls | null = null;

const sheet = createWarningSheet({
  onFlyTo: (warning) => mapControls?.flyToWarning(warning),
});

import("./map/index.ts").then(({ initMap }) => {
  mapControls = initMap(mapContainer, {
    onWarningSelect: (id) => sheet.selectWarning(id),
    onWarningsUpdate: (warnings) => sheet.updateWarnings(warnings),
  });
});
