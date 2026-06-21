import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app element not found");

const mapContainer = document.createElement("div");
mapContainer.id = "map";
app.appendChild(mapContainer);

import("./map/index.ts").then(({ initMap }) => {
  initMap(mapContainer);
});
