// Editorial content computed from race data — the "winners and losers"
// and "by the numbers" sections of a GP page. Pure functions, no fetching.

import type { RoundResultRow } from "./jolpica";
import type { PosSample, RaceControlMsg } from "./openf1";

// A finisher either has a time ("1:28:41.3", "+4.882") or was lapped ("+1 Lap").
export function isFinisher(row: RoundResultRow): boolean {
  return row.time.includes(":") || row.time.startsWith("+");
}

export type Mover = {
  row: RoundResultRow;
  delta: number; // places gained (positive) or lost (negative)
  dnf: boolean;
};

// Biggest climbers and biggest disappointments, by grid -> finish.
// A DNF from a decent grid slot beats any mere position loss.
export function winnersAndLosers(rows: RoundResultRow[]): {
  winners: Mover[];
  losers: Mover[];
} {
  const classified = rows.filter((r) => r.grid > 0); // pit-lane starts excluded
  const finishers = classified.filter(isFinisher);
  const dnfs = classified.filter((r) => !isFinisher(r));

  const winners = [...finishers]
    .map((row) => ({ row, delta: row.grid - row.pos, dnf: false }))
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const lostPlaces = [...finishers]
    .map((row) => ({ row, delta: row.grid - row.pos, dnf: false }))
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta);
  const dnfLosers = [...dnfs]
    .sort((a, b) => a.grid - b.grid)
    .map((row) => ({ row, delta: 0, dnf: true }));

  const losers = [...dnfLosers, ...lostPlaces].slice(0, 3);
  return { winners, losers };
}

// The race-control messages a report would actually mention.
export function keyMoments(msgs: RaceControlMsg[]): RaceControlMsg[] {
  const kept: RaceControlMsg[] = [];
  for (const m of msgs) {
    const text = m.message.toUpperCase();
    const isMoment =
      m.category === "SafetyCar" ||
      m.flag === "RED" ||
      m.flag === "CHEQUERED" ||
      text.includes("PENALTY FOR") ||
      (text.includes("INCIDENT") && text.includes("NOTED")) ||
      text.includes("FALSE START");
    // Skip the stewards' echo of an already-noted incident.
    if (isMoment && !text.includes("UNDER INVESTIGATION")) {
      kept.push(m);
    }
  }
  return kept.slice(0, 10);
}

// "+4.882" -> 4.882; winner row or DNF rows give null.
export function winningMargin(rows: RoundResultRow[]): number | null {
  const second = rows.find((r) => r.pos === 2);
  if (!second || !second.time.startsWith("+") || second.time.includes("Lap")) {
    return null;
  }
  const n = Number(second.time.replace("+", ""));
  return Number.isFinite(n) ? n : null;
}

// How many times the lead changed hands, from raw position samples.
export function leadChanges(pos: PosSample[]): number {
  let leader = -1;
  let changes = -1; // first leader isn't a "change"
  for (const p of pos) {
    if (p.position === 1 && p.driver !== leader) {
      leader = p.driver;
      changes++;
    }
  }
  return Math.max(0, changes);
}

// Count actual deployments, not every SC-category message.
export function safetyCars(msgs: RaceControlMsg[]): number {
  return msgs.filter((m) => m.message.toUpperCase().includes("SAFETY CAR DEPLOYED"))
    .length;
}
