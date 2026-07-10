import { expect, test } from "bun:test";
import {
  compoundAtLap,
  currentLap,
  formatElapsed,
  formatGap,
  formatLapTime,
  indexAtTime,
  latestAtTime,
  orderAtTime,
} from "./replay";
import type { Lap, PosSample, Stint } from "./openf1";

test("indexAtTime finds the last sample at or before t", () => {
  const times = [10, 20, 30, 40];
  expect(indexAtTime(times, 5)).toBe(-1); // before first
  expect(indexAtTime(times, 20)).toBe(1); // exact hit
  expect(indexAtTime(times, 27)).toBe(1); // between samples
  expect(indexAtTime(times, 99)).toBe(3); // past the end
  expect(indexAtTime([], 5)).toBe(-1); // empty
});

test("orderAtTime uses each driver's latest position before t", () => {
  const pos: PosSample[] = [
    { t: 0, driver: 44, position: 1 },
    { t: 0, driver: 16, position: 2 },
    { t: 50, driver: 16, position: 1 }, // overtake at t=50
    { t: 50, driver: 44, position: 2 },
  ];
  expect(orderAtTime(pos, 10)).toEqual([44, 16]);
  expect(orderAtTime(pos, 60)).toEqual([16, 44]);
});

test("formatLapTime renders m:ss.mmm", () => {
  expect(formatLapTime(93.72)).toBe("1:33.720");
  expect(formatLapTime(null)).toBe("—");
});

test("currentLap reports lap number and previous lap time", () => {
  const laps: Lap[] = [
    { lap: 1, t: 0, duration: 95.5 },
    { lap: 2, t: 95500, duration: 93.72 },
    { lap: 3, t: 189220, duration: null },
  ];
  expect(currentLap(laps, 100000)).toEqual({
    lap: 2,
    total: 3,
    lastLap: "1:35.500",
  });
  expect(currentLap(laps, -5).lap).toBe(0);
});

test("compoundAtLap picks the stint covering the lap", () => {
  const stints: Stint[] = [
    { driver: 12, lapStart: 1, lapEnd: 35, compound: "MEDIUM" },
    { driver: 12, lapStart: 36, lapEnd: 44, compound: "HARD" },
  ];
  expect(compoundAtLap(stints, 35)).toBe("M");
  expect(compoundAtLap(stints, 36)).toBe("H");
  expect(compoundAtLap(stints, 99)).toBe("—");
});

test("latestAtTime picks the newest row at or before t", () => {
  const rows = [
    { t: 10, v: "a" },
    { t: 20, v: "b" },
  ];
  expect(latestAtTime(rows, 5)).toBeNull();
  expect(latestAtTime(rows, 15)?.v).toBe("a");
  expect(latestAtTime(rows, 99)?.v).toBe("b");
});

test("formatElapsed renders +m:ss", () => {
  expect(formatElapsed(83000)).toBe("+1:23");
  expect(formatElapsed(-5)).toBe("+0:00");
});

test("formatGap labels the leader and formats seconds", () => {
  expect(formatGap(null)).toBe("Leader");
  expect(formatGap(4.882)).toBe("+4.88");
});
