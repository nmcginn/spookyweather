const OUTLOOK_URL = "https://www.spc.noaa.gov/products/outlook/day1probotlk_torn.png";
const WATCHES_URL = "https://www.spc.noaa.gov/products/watch/validww.png";

export type SpcPanelControls = {
  toggle(): void;
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeSection(label: string): { section: HTMLElement; img: HTMLImageElement } {
  const section = document.createElement("div");
  section.className = "spc__section";

  const heading = document.createElement("h3");
  heading.className = "spc__section-label";
  heading.textContent = label;
  section.appendChild(heading);

  const img = document.createElement("img");
  img.className = "spc__img";
  img.alt = label;
  img.loading = "eager";
  section.appendChild(img);

  return { section, img };
}

export function createSpcPanel(): SpcPanelControls {
  let fetchedAt: Date | null = null;

  // Backdrop / overlay
  const overlay = document.createElement("div");
  overlay.className = "spc";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "SPC Tornado Outlook & Watches");
  overlay.hidden = true;

  // Inner panel
  const panel = document.createElement("div");
  panel.className = "spc__panel";

  // Header
  const header = document.createElement("div");
  header.className = "spc__header";

  const titleEl = document.createElement("h2");
  titleEl.className = "spc__title";
  titleEl.textContent = "SPC Outlook & Watches";

  const actions = document.createElement("div");
  actions.className = "spc__header-actions";

  const timestamp = document.createElement("span");
  timestamp.className = "spc__timestamp";

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "spc__refresh-btn";
  refreshBtn.type = "button";
  refreshBtn.setAttribute("aria-label", "Refresh SPC images");
  refreshBtn.textContent = "↺";

  const closeBtn = document.createElement("button");
  closeBtn.className = "spc__close-btn";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close SPC panel");
  closeBtn.textContent = "✕";

  actions.appendChild(timestamp);
  actions.appendChild(refreshBtn);
  actions.appendChild(closeBtn);
  header.appendChild(titleEl);
  header.appendChild(actions);
  panel.appendChild(header);

  // Body with images
  const body = document.createElement("div");
  body.className = "spc__body";

  const { section: watchesSection, img: watchesImg } = makeSection("Active Tornado Watches");
  const { section: outlookSection, img: outlookImg } = makeSection("Day 1 Tornado Outlook");
  outlookSection.dataset.secondary = "true";
  body.appendChild(watchesSection);
  body.appendChild(outlookSection);
  panel.appendChild(body);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function loadImages(): void {
    const bust = `?t=${Date.now()}`;
    outlookImg.src = OUTLOOK_URL + bust;
    watchesImg.src = WATCHES_URL + bust;
    fetchedAt = new Date();
    timestamp.textContent = `Updated ${formatTime(fetchedAt)}`;
  }

  function close(): void {
    overlay.hidden = true;
  }

  function open(): void {
    overlay.hidden = false;
    if (fetchedAt === null) loadImages();
  }

  refreshBtn.addEventListener("click", loadImages);
  closeBtn.addEventListener("click", close);

  // Close on backdrop click (outside the panel)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Swipe the header down to dismiss
  let swipeY0 = 0;
  header.addEventListener(
    "touchstart",
    (e) => {
      swipeY0 = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  header.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    if (touch && touch.clientY - swipeY0 > 60) {
      e.preventDefault();
      close();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  return {
    toggle() {
      if (overlay.hidden) open();
      else close();
    },
  };
}
