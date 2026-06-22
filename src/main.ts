import "./style.css";
import type { MapControls } from "./map/index.ts";
import type { WeatherWarning } from "./nws/types.ts";
import { createAboutPanel } from "./ui/about-panel.ts";
import { createSpcPanel } from "./ui/spc-panel.ts";
import { createWarningSheet } from "./ui/warning-sheet.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app element not found");

const mapContainer = document.createElement("div");
mapContainer.id = "map";
app.appendChild(mapContainer);

let mapControls: MapControls | null = null;
let allWarnings: WeatherWarning[] = [];

const sheet = createWarningSheet({
  onFlyTo: (warning) => mapControls?.flyToWarning(warning),
  onFilterChange: (activeTypes) => {
    const filtered = allWarnings.filter((w) => activeTypes.has(w.eventType as never));
    sheet.updateWarnings(filtered);
    mapControls?.updateWarnings(filtered);
  },
});

const spcPanel = createSpcPanel();
const aboutPanel = createAboutPanel();

import("./map/index.ts").then(({ initMap }) => {
  mapControls = initMap(mapContainer, {
    onWarningSelect: (id) => sheet.selectWarning(id),
    onWarningsUpdate: (warnings) => {
      allWarnings = warnings;
      sheet.updateWarnings(warnings);
      sheet.updateLastRefreshed(new Date());
    },
    onSpcToggle: () => spcPanel.toggle(),
    onAboutOpen: () => aboutPanel.open(),
  });
});
