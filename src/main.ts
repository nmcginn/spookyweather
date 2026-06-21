const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app element not found");
}

app.textContent = "Tornado Tracker — coming soon";
