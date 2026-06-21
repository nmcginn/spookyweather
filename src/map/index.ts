import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";

const CONUS_CENTER: [number, number] = [-96, 39];
const CONUS_ZOOM = 4;
const BASE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function initMap(container: HTMLElement): maplibregl.Map {
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

  return map;
}
