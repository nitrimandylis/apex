// Pure helpers for the telemetry replay. No fetching, no React — just math
// over already-loaded arrays, so everything here is easy to test.

import type { Lap, PosSample, Stint } from "./openf1";

// Index of the last element in `times` (sorted ascending) that is <= t.
// Returns -1 when t is before the first element. Binary search because
// car data has ~20k samples and this runs several times a second.
export function indexAtTime(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (times[mid] <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// Driver numbers in running order at time t: for each driver take their
// latest known position at or before t, then sort by it.
export function orderAtTime(pos: PosSample[], t: number): number[] {
  const latest = new Map<number, number>(); // driver -> position
  for (const p of pos) {
    if (p.t > t) {
      break; // samples are sorted by time
    }
    latest.set(p.driver, p.position);
  }
  return [...latest.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([driver]) => driver);
}

export function formatLapTime(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const mins = Math.floor(seconds / 60);
  const rest = seconds - mins * 60;
  return `${mins}:${rest.toFixed(3).padStart(6, "0")}`;
}

// Current lap number, total laps and the previous lap's time at time t.
export function currentLap(
  laps: Lap[],
  t: number,
): { lap: number; total: number; lastLap: string } {
  const total = laps.length > 0 ? laps[laps.length - 1].lap : 0;
  const idx = indexAtTime(
    laps.map((l) => l.t),
    t,
  );
  if (idx === -1) {
    return { lap: 0, total, lastLap: "—" };
  }
  const previous = idx > 0 ? laps[idx - 1].duration : null;
  return { lap: laps[idx].lap, total, lastLap: formatLapTime(previous) };
}

// Tyre compound letter for one driver's stints at the given lap.
export function compoundAtLap(stints: Stint[], lap: number): string {
  const stint = stints.find((s) => lap >= s.lapStart && lap <= s.lapEnd);
  if (!stint || stint.compound === "") {
    return "—";
  }
  return stint.compound[0]; // SOFT -> S, MEDIUM -> M, ...
}

// Latest row at or before time t, for any time-stamped series
// (weather, car location, race control...). Null before the first row.
export function latestAtTime<T extends { t: number }>(
  rows: T[],
  t: number,
): T | null {
  const idx = indexAtTime(
    rows.map((r) => r.t),
    t,
  );
  return idx === -1 ? null : rows[idx];
}

// "+mm:ss" elapsed session clock.
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `+${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatGap(gap: number | null): string {
  if (gap === null || gap === 0) {
    return "Leader";
  }
  return `+${gap.toFixed(2)}`;
}
