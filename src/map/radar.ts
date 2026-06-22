import type maplibregl from "maplibre-gl";

const SOURCE_ID = "radar-nexrad";
const LAYER_ID = "radar-nexrad";
const REFRESH_MS = 5 * 60 * 1000;
const TILE_BASE =
  "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png";

// Epoch changes every minute — browsers cache within a minute, but pick up new scans on refresh
function currentTiles(): string[] {
  const epoch = Math.floor(Date.now() / 60_000);
  return [`${TILE_BASE}?t=${epoch}`];
}

export type RadarControls = {
  setVisible(visible: boolean): void;
  setOpacity(opacity: number): void;
  stop(): void;
};

export function setupRadarLayer(map: maplibregl.Map, beforeLayerId: string): RadarControls {
  map.addSource(SOURCE_ID, {
    type: "raster",
    tiles: currentTiles(),
    tileSize: 256,
    minzoom: 0,
    maxzoom: 8,
    attribution:
      '<a href="https://mesonet.agron.iastate.edu/ogc/" target="_blank" rel="noopener">IEM NEXRAD</a>',
  });

  map.addLayer(
    {
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: {
        "raster-opacity": 0.7,
        "raster-fade-duration": 500,
      },
      layout: { visibility: "none" },
    } as unknown as maplibregl.AddLayerObject,
    beforeLayerId,
  );

  let visible = false;
  let stopped = false;

  function refreshTiles(): void {
    if (!visible) return;
    const source = map.getSource(SOURCE_ID) as unknown as
      | { setTiles(tiles: string[]): void }
      | undefined;
    if (!source) return;
    try {
      source.setTiles(currentTiles());
    } catch (err) {
      console.warn("[radar] tile refresh failed:", err);
    }
  }

  const timer = setInterval(() => {
    if (!stopped) refreshTiles();
  }, REFRESH_MS);

  return {
    setVisible(v: boolean) {
      visible = v;
      map.setLayoutProperty(LAYER_ID, "visibility", v ? "visible" : "none");
      if (v) refreshTiles();
    },
    setOpacity(opacity: number) {
      map.setPaintProperty(LAYER_ID, "raster-opacity", opacity);
    },
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

export function createRadarControl(controls: RadarControls): maplibregl.IControl {
  let visible = false;
  let el: HTMLDivElement | null = null;

  function syncEl(): void {
    if (!el) return;
    const btn = el.querySelector<HTMLButtonElement>(".radar-ctrl__btn");
    const sliderRow = el.querySelector<HTMLElement>(".radar-ctrl__slider-row");
    if (btn) {
      btn.setAttribute("aria-pressed", String(visible));
      btn.classList.toggle("radar-ctrl__btn--on", visible);
    }
    if (sliderRow) sliderRow.hidden = !visible;
  }

  return {
    onAdd(_map: maplibregl.Map): HTMLElement {
      el = document.createElement("div");
      el.className = "maplibregl-ctrl radar-ctrl";

      const btn = document.createElement("button");
      btn.className = "radar-ctrl__btn";
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Toggle radar overlay");
      btn.textContent = "RADAR";
      btn.addEventListener("click", () => {
        visible = !visible;
        controls.setVisible(visible);
        syncEl();
      });

      const sliderRow = document.createElement("div");
      sliderRow.className = "radar-ctrl__slider-row";
      sliderRow.hidden = true;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.className = "radar-ctrl__slider";
      slider.min = "0";
      slider.max = "1";
      slider.step = "0.05";
      slider.value = "0.7";
      slider.setAttribute("aria-label", "Radar opacity");
      slider.addEventListener("input", () => {
        controls.setOpacity(Number(slider.value));
      });

      sliderRow.appendChild(slider);
      el.appendChild(btn);
      el.appendChild(sliderRow);

      return el;
    },
    onRemove(_map: maplibregl.Map): void {
      el?.remove();
      el = null;
      controls.stop();
    },
  };
}
