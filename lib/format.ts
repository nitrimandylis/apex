import type { Race } from "./jolpica";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// First race whose start is still in the future.
export function nextRace(races: Race[], now: Date): Race | undefined {
  return races.find((r) => new Date(r.raceStart).getTime() > now.getTime());
}

export function countdownParts(
  targetIso: string,
  now: Date,
): { days: string; hours: string; mins: string; secs: string } {
  const diff = Math.max(0, new Date(targetIso).getTime() - now.getTime());
  return {
    days: pad(Math.floor(diff / 86400000)),
    hours: pad(Math.floor(diff / 3600000) % 24),
    mins: pad(Math.floor(diff / 60000) % 60),
    secs: pad(Math.floor(diff / 1000) % 60),
  };
}

export function pointsGap(leaderPts: number, pts: number): string {
  if (pts === leaderPts) {
    return "—";
  }
  return `-${leaderPts - pts}`;
}

// "Spa · 19 Jul, 15:00" in the visitor's locale — used where space is tight.
export function shortRaceLine(race: Race): string {
  const d = new Date(race.raceStart);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${race.locality} · ${day}, ${time}`;
}
