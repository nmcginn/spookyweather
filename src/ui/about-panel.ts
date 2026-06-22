export function createAboutPanel(): { open: () => void } {
  const backdrop = document.createElement("div");
  backdrop.className = "about-backdrop";
  backdrop.setAttribute("hidden", "");
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "About Spooky Weather Tracker");

  const panel = document.createElement("div");
  panel.className = "about-panel";

  panel.innerHTML = `
    <div class="about__header">
      <h2 class="about__title">Spooky Weather Tracker</h2>
      <button class="about__close" aria-label="Close about panel">✕</button>
    </div>
    <div class="about__body">
      <p class="about__blurb">
        Live U.S. severe weather warnings direct from the
        <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer" class="about__link">National Weather Service</a>.
        No ads, no account, no API key.
      </p>
      <ul class="about__sources">
        <li><span class="about__src-label">Warnings</span> NWS <code>api.weather.gov/alerts</code></li>
        <li><span class="about__src-label">Radar</span> IEM NEXRAD composite (Iowa Mesonet)</li>
        <li><span class="about__src-label">Outlook</span> SPC Day-1 Tornado Outlook</li>
        <li><span class="about__src-label">Map</span> OpenFreeMap (MapLibre GL JS)</li>
      </ul>
      <p class="about__disclaimer">
        For life-threatening emergencies always rely on official NWS alerts and local
        emergency management. This tool is informational only.
      </p>
      <div class="about__footer">
        <a href="https://github.com/nmcginn/spookyweather" target="_blank" rel="noopener noreferrer" class="about__link">
          Source on GitHub
        </a>
      </div>
    </div>
  `;

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  const closeBtnEl = panel.querySelector<HTMLButtonElement>(".about__close");
  if (!closeBtnEl) throw new Error("About panel close button not found");
  const closeBtn: HTMLButtonElement = closeBtnEl;

  function close() {
    backdrop.setAttribute("hidden", "");
    backdrop.removeAttribute("style");
    closeBtn.removeEventListener("click", close);
  }

  function open() {
    backdrop.removeAttribute("hidden");
    backdrop.style.display = "flex";
    closeBtn.addEventListener("click", close);
    closeBtn.focus();
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return { open };
}
