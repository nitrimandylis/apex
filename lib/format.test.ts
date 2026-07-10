import { expect, test } from "bun:test";
import { countdownParts, nextRace, pointsGap } from "./format";
import type { Race } from "./jolpica";

function race(round: number, raceStart: string): Race {
  return {
    round,
    name: `Race ${round}`,
    circuit: "",
    locality: "",
    country: "",
    date: raceStart.slice(0, 10),
    raceStart,
    sessions: [],
  };
}

test("nextRace picks the first race still in the future", () => {
  const races = [
    race(9, "2026-07-05T14:00:00Z"),
    race(10, "2026-07-19T13:00:00Z"),
    race(11, "2026-07-26T13:00:00Z"),
  ];
  const now = new Date("2026-07-10T12:00:00Z");
  expect(nextRace(races, now)?.round).toBe(10);
});

test("countdownParts pads and splits the difference", () => {
  const now = new Date("2026-07-18T10:58:57Z");
  const parts = countdownParts("2026-07-19T13:00:00Z", now);
  expect(parts).toEqual({ days: "01", hours: "02", mins: "01", secs: "03" });
});

test("countdownParts clamps at zero once the target passes", () => {
  const now = new Date("2026-07-20T00:00:00Z");
  const parts = countdownParts("2026-07-19T13:00:00Z", now);
  expect(parts).toEqual({ days: "00", hours: "00", mins: "00", secs: "00" });
});

test("pointsGap shows a dash for the leader and minus points otherwise", () => {
  expect(pointsGap(179, 179)).toBe("—");
  expect(pointsGap(179, 147)).toBe("-32");
});
