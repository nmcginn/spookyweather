import type maplibregl from "maplibre-gl";

export function createAboutControl(onOpen: () => void): maplibregl.IControl {
  let el: HTMLDivElement | null = null;

  return {
    onAdd(_map: maplibregl.Map): HTMLElement {
      el = document.createElement("div");
      el.className = "maplibregl-ctrl spc-ctrl";

      const btn = document.createElement("button");
      btn.className = "spc-ctrl__btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "About Spooky Weather Tracker");
      btn.textContent = "?";
      btn.addEventListener("click", onOpen);

      el.appendChild(btn);
      return el;
    },
    onRemove(_map: maplibregl.Map): void {
      el?.remove();
      el = null;
    },
  };
}
