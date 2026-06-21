import type { TornadoWarning } from "./types.ts";

export function vtecKey(vtec: string): string | null {
  // /O.NEW.KSGF.TO.W.0023.240501T2000Z-240501T2045Z/
  const inner = vtec.replace(/^\/|\/$/g, "");
  const parts = inner.split(".");
  // need at least: type, action, office, phenomena, significance, ETN
  if (parts.length < 6) return null;
  return `${parts[2]}.${parts[3]}.${parts[4]}.${parts[5]}`;
}

export function dedup(warnings: TornadoWarning[], now: Date = new Date()): TornadoWarning[] {
  const nowMs = now.getTime();
  const byKey = new Map<string, TornadoWarning>();
  const unkeyed: TornadoWarning[] = [];

  for (const w of warnings) {
    if (!w.vtec) {
      unkeyed.push(w);
      continue;
    }
    const key = vtecKey(w.vtec);
    if (!key) {
      unkeyed.push(w);
      continue;
    }

    const existing = byKey.get(key);
    if (!existing || new Date(w.sent).getTime() > new Date(existing.sent).getTime()) {
      byKey.set(key, w);
    }
  }

  return [...byKey.values(), ...unkeyed].filter((w) => {
    if (w.messageType === "Cancel") return false;
    if (new Date(w.expires).getTime() <= nowMs) return false;
    return true;
  });
}
