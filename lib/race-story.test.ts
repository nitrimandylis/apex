import { expect, test } from "bun:test";
import {
  keyMoments,
  leadChanges,
  safetyCars,
  winnersAndLosers,
  winningMargin,
} from "./race-story";
import type { RoundResultRow } from "./jolpica";
import type { PosSample, RaceControlMsg } from "./openf1";

function row(
  pos: number,
  grid: number,
  time: string,
  familyName = `D${pos}`,
): RoundResultRow {
  return {
    pos,
    familyName,
    fullName: familyName,
    constructorId: "ferrari",
    team: "Ferrari",
    grid,
    time,
    points: 0,
    fastestLap: false,
  };
}

const rows: RoundResultRow[] = [
  row(1, 2, "1:28:41.335"), // gained 1
  row(2, 1, "+0.427"), // lost 1 (pole didn't convert)
  row(3, 10, "+7.1"), // gained 7 — biggest winner
  row(4, 4, "+9.0"),
  row(5, 0, "+12.0"), // pit-lane start, excluded from movers
  row(18, 3, "Accident", "Crashed"), // DNF from P3 — biggest loser
];

test("winnersAndLosers ranks climbers and flags DNFs first", () => {
  const { winners, losers } = winnersAndLosers(rows);
  expect(winners[0].row.grid).toBe(10);
  expect(winners[0].delta).toBe(7);
  expect(losers[0].dnf).toBe(true);
  expect(losers[0].row.familyName).toBe("Crashed");
  expect(losers[1].delta).toBe(-1);
});

test("winningMargin parses P2's gap", () => {
  expect(winningMargin(rows)).toBe(0.427);
  expect(winningMargin([row(1, 1, "1:30:00.0"), row(2, 5, "+1 Lap")])).toBeNull();
});

const msgs: RaceControlMsg[] = [
  { t: 1, category: "Flag", flag: "BLUE", message: "WAVED BLUE FLAG FOR CAR 31" },
  { t: 2, category: "SafetyCar", flag: null, message: "SAFETY CAR DEPLOYED" },
  { t: 3, category: "Other", flag: null, message: "FIA STEWARDS: TURN 6 INCIDENT INVOLVING CARS 23 AND 87 UNDER INVESTIGATION" },
  { t: 4, category: "Other", flag: null, message: "FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 23 (ALB)" },
  { t: 5, category: "SafetyCar", flag: null, message: "SAFETY CAR IN THIS LAP" },
];

test("keyMoments keeps the report-worthy messages only", () => {
  const kept = keyMoments(msgs);
  expect(kept.map((m) => m.t)).toEqual([2, 4, 5]);
});

test("safetyCars counts deployments, not every SC message", () => {
  expect(safetyCars(msgs)).toBe(1);
});

test("leadChanges counts distinct new leaders", () => {
  const pos: PosSample[] = [
    { t: 1, driver: 12, position: 1 },
    { t: 2, driver: 44, position: 2 },
    { t: 3, driver: 44, position: 1 }, // change 1
    { t: 4, driver: 44, position: 1 }, // same leader, no change
    { t: 5, driver: 12, position: 1 }, // change 2
  ];
  expect(leadChanges(pos)).toBe(2);
});
