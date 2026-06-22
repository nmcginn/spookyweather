import { warningColor, warningLabel } from "../map/warning-data.ts";
import type { SupportedEventType } from "../nws/poller.ts";
import { SUPPORTED_EVENT_TYPES } from "../nws/poller.ts";
import type { WeatherWarning } from "../nws/types.ts";

export type WarningSheetOptions = {
  onFlyTo: (warning: WeatherWarning) => void;
  onFilterChange: (activeTypes: Set<SupportedEventType>) => void;
};

export type WarningSheetControls = {
  updateWarnings: (warnings: WeatherWarning[]) => void;
  selectWarning: (id: string) => void;
  updateLastRefreshed: (ts: Date) => void;
};

const EVENT_CHIP_LABELS: Record<SupportedEventType, string> = {
  "Tornado Warning": "TORNADO",
  "Severe Thunderstorm Warning": "TSTORM",
  "Flash Flood Warning": "FLOOD",
};

const EVENT_CHIP_COLORS: Record<SupportedEventType, string> = {
  "Tornado Warning": "#FF4400",
  "Severe Thunderstorm Warning": "#DAA520",
  "Flash Flood Warning": "#00AA00",
};

function formatExpiry(isoString: string): { text: string; urgent: boolean } {
  const minsLeft = Math.round((new Date(isoString).getTime() - Date.now()) / 60_000);
  if (minsLeft <= 0) return { text: "Expired", urgent: true };
  if (minsLeft < 15) return { text: `${minsLeft} min remaining`, urgent: true };
  return { text: `${minsLeft} min remaining`, urgent: false };
}

function onSwipe(el: HTMLElement, onDown?: () => void, onUp?: () => void, threshold = 60) {
  let y0 = 0;
  el.addEventListener(
    "touchstart",
    (e) => {
      y0 = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  el.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dy = touch.clientY - y0;
    if (dy > threshold && onDown) {
      e.preventDefault();
      onDown();
    } else if (dy < -threshold && onUp) {
      e.preventDefault();
      onUp();
    }
  });
}

export function createWarningSheet(options: WarningSheetOptions): WarningSheetControls {
  const { onFlyTo, onFilterChange } = options;
  let warnings: WeatherWarning[] = [];
  let selectedId: string | null = null;
  let isOpen = false;
  const activeTypes = new Set<SupportedEventType>(SUPPORTED_EVENT_TYPES);

  // Scrim — transparent overlay that catches taps on the map while the sheet is open
  const scrim = document.createElement("div");
  scrim.className = "ws-scrim";
  document.body.appendChild(scrim);

  // Root sheet element
  const sheet = document.createElement("div");
  sheet.className = "ws";
  sheet.setAttribute("role", "complementary");
  sheet.setAttribute("aria-label", "Weather Warnings");

  // Toggle handle
  const handle = document.createElement("div");
  handle.className = "ws__handle";
  handle.setAttribute("role", "button");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-expanded", "false");
  handle.setAttribute("aria-label", "Toggle warning list");

  const pill = document.createElement("div");
  pill.className = "ws__pill";

  const headerRow = document.createElement("div");
  headerRow.className = "ws__header-row";

  const indicator = document.createElement("div");
  indicator.className = "ws__indicator ws__indicator--none";

  const titleEl = document.createElement("span");
  titleEl.className = "ws__title";
  titleEl.textContent = "Loading warnings…";

  const chevron = document.createElement("span");
  chevron.className = "ws__chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▲";

  headerRow.appendChild(indicator);
  headerRow.appendChild(titleEl);
  headerRow.appendChild(chevron);
  handle.appendChild(pill);
  handle.appendChild(headerRow);
  sheet.appendChild(handle);

  // Filter chips row
  const filterRow = document.createElement("div");
  filterRow.className = "ws__filter-row";

  const chipEls = new Map<SupportedEventType, HTMLButtonElement>();

  const refreshTime = document.createElement("span");
  refreshTime.className = "ws__refresh-time";

  for (const eventType of SUPPORTED_EVENT_TYPES) {
    const chip = document.createElement("button");
    chip.className = "ws__filter-chip ws__filter-chip--on";
    chip.textContent = EVENT_CHIP_LABELS[eventType];
    chip.style.setProperty("--chip-color", EVENT_CHIP_COLORS[eventType]);
    chip.setAttribute("aria-pressed", "true");
    chip.setAttribute("aria-label", `Toggle ${eventType}`);
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeTypes.has(eventType)) {
        if (activeTypes.size === 1) return; // keep at least one type active
        activeTypes.delete(eventType);
        chip.classList.remove("ws__filter-chip--on");
        chip.setAttribute("aria-pressed", "false");
      } else {
        activeTypes.add(eventType);
        chip.classList.add("ws__filter-chip--on");
        chip.setAttribute("aria-pressed", "true");
      }
      onFilterChange(new Set(activeTypes));
      updateTitle();
      if (selectedId === null) renderList();
    });
    chipEls.set(eventType, chip);
    filterRow.appendChild(chip);
  }

  filterRow.appendChild(refreshTime);
  sheet.appendChild(filterRow);

  // Scrollable content
  const content = document.createElement("div");
  content.className = "ws__content";
  sheet.appendChild(content);

  document.body.appendChild(sheet);

  function open() {
    isOpen = true;
    sheet.classList.add("ws--open");
    sheet.classList.remove("ws--detail");
    handle.setAttribute("aria-expanded", "true");
    scrim.classList.add("ws-scrim--visible");
  }

  function close() {
    isOpen = false;
    selectedId = null;
    sheet.classList.remove("ws--open", "ws--detail");
    handle.setAttribute("aria-expanded", "false");
    scrim.classList.remove("ws-scrim--visible");
  }

  function expandDetail() {
    isOpen = true;
    sheet.classList.add("ws--open", "ws--detail");
    handle.setAttribute("aria-expanded", "true");
    scrim.classList.add("ws-scrim--visible");
  }

  handle.addEventListener("click", () => {
    if (isOpen) {
      if (selectedId !== null) {
        // Detail view → back to list
        selectedId = null;
        sheet.classList.remove("ws--detail");
        renderList();
      } else {
        close();
      }
    } else {
      open();
    }
  });

  handle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handle.click();
    }
  });

  scrim.addEventListener("click", () => close());

  onSwipe(
    handle,
    () => {
      if (isOpen) close();
    },
    () => {
      if (!isOpen) open();
    },
  );
  onSwipe(scrim, () => close());

  function visibleWarnings(): WeatherWarning[] {
    return warnings.filter((w) => activeTypes.has(w.eventType as SupportedEventType));
  }

  function updateTitle() {
    const visible = visibleWarnings();
    const n = visible.length;
    if (n === 0) {
      titleEl.textContent = "No active warnings";
      indicator.className = "ws__indicator ws__indicator--none";
    } else {
      titleEl.textContent = n === 1 ? "1 active warning" : `${n} active warnings`;
      indicator.className = "ws__indicator ws__indicator--active";
    }
  }

  function renderList() {
    content.innerHTML = "";
    const visible = visibleWarnings();

    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ws__empty";
      empty.textContent = "No active warnings for selected types.";
      content.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "ws__list";

    for (const w of visible) {
      const { text: expiryText, urgent } = formatExpiry(w.expires);
      const color = warningColor(w);
      const label = warningLabel(w);

      const item = document.createElement("li");
      item.className = "ws__item";
      item.style.setProperty("--sev-color", color);

      const badge = document.createElement("div");
      badge.className = "ws__item-badge";
      badge.style.background = color;
      badge.textContent = label;

      const sender = document.createElement("div");
      sender.className = "ws__item-sender";
      sender.textContent = w.senderName;

      const counties = document.createElement("div");
      counties.className = "ws__item-counties";
      counties.textContent = w.counties;

      const expiry = document.createElement("div");
      expiry.className = urgent ? "ws__item-expiry ws__item-expiry--urgent" : "ws__item-expiry";
      expiry.textContent = expiryText;

      item.appendChild(badge);
      item.appendChild(sender);
      item.appendChild(counties);
      item.appendChild(expiry);

      item.addEventListener("click", () => {
        selectWarning(w.id);
        if (w.polygon) onFlyTo(w);
      });

      list.appendChild(item);
    }

    content.appendChild(list);
  }

  function renderDetail(w: WeatherWarning) {
    const { text: expiryText, urgent } = formatExpiry(w.expires);
    const color = warningColor(w);
    const label = warningLabel(w);

    content.innerHTML = "";

    const detail = document.createElement("div");
    detail.className = "ws__detail";

    const backBtn = document.createElement("button");
    backBtn.className = "ws__back";
    backBtn.textContent = "← All warnings";
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedId = null;
      sheet.classList.remove("ws--detail");
      renderList();
    });
    detail.appendChild(backBtn);

    const badge = document.createElement("div");
    badge.className = "ws__detail-badge";
    badge.style.background = color;
    badge.textContent = label;
    detail.appendChild(badge);

    const sender = document.createElement("div");
    sender.className = "ws__detail-sender";
    sender.textContent = w.senderName;
    detail.appendChild(sender);

    const meta = document.createElement("div");
    meta.className = "ws__detail-meta";

    const counties = document.createElement("div");
    counties.className = "ws__detail-counties";
    counties.textContent = w.counties;
    meta.appendChild(counties);

    const expiry = document.createElement("div");
    expiry.className = urgent ? "ws__detail-expiry ws__detail-expiry--urgent" : "ws__detail-expiry";
    expiry.textContent = expiryText;
    meta.appendChild(expiry);

    if (w.motion) {
      const motion = document.createElement("div");
      motion.className = "ws__detail-motion";
      motion.textContent = `Motion: ${w.motion}`;
      meta.appendChild(motion);
    }

    detail.appendChild(meta);

    if (w.description) {
      const descSection = document.createElement("div");
      descSection.className = "ws__detail-section";

      const descText = document.createElement("pre");
      descText.className = "ws__detail-text";
      descText.textContent = w.description;
      descSection.appendChild(descText);
      detail.appendChild(descSection);
    }

    if (w.instruction) {
      const instrSection = document.createElement("div");
      instrSection.className = "ws__detail-section ws__detail-section--instr";

      const instrLabel = document.createElement("div");
      instrLabel.className = "ws__detail-label";
      instrLabel.textContent = "WHAT TO DO";
      instrSection.appendChild(instrLabel);

      const instrText = document.createElement("pre");
      instrText.className = "ws__detail-text";
      instrText.textContent = w.instruction;
      instrSection.appendChild(instrText);

      detail.appendChild(instrSection);
    }

    content.appendChild(detail);
  }

  function selectWarning(id: string) {
    selectedId = id;
    const w = warnings.find((x) => x.id === id);
    if (!w) return;
    expandDetail();
    renderDetail(w);
  }

  return {
    updateLastRefreshed(ts: Date) {
      refreshTime.textContent = `Updated ${ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    },
    updateWarnings(newWarnings: WeatherWarning[]) {
      warnings = [...newWarnings].sort(
        (a, b) => new Date(b.sent).getTime() - new Date(a.sent).getTime(),
      );
      updateTitle();
      if (selectedId !== null) {
        const stillActive = warnings.find((w) => w.id === selectedId);
        if (stillActive) {
          renderDetail(stillActive);
        } else {
          selectedId = null;
          sheet.classList.remove("ws--detail");
          renderList();
        }
      } else {
        renderList();
      }
    },
    selectWarning,
  };
}
