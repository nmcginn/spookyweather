import type maplibregl from "maplibre-gl";

export function createSpcControl(onToggle: () => void): maplibregl.IControl {
  let el: HTMLDivElement | null = null;

  return {
    onAdd(_map: maplibregl.Map): HTMLElement {
      el = document.createElement("div");
      el.className = "maplibregl-ctrl spc-ctrl";

      const btn = document.createElement("button");
      btn.className = "spc-ctrl__btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Toggle SPC outlook & watches panel");
      btn.textContent = "SPC";
      btn.addEventListener("click", onToggle);

      el.appendChild(btn);
      return el;
    },
    onRemove(_map: maplibregl.Map): void {
      el?.remove();
      el = null;
    },
  };
}
