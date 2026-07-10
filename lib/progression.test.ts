import { expect, test } from "bun:test";
import { buildProgression, type RoundPoints } from "./progression";

const rows: RoundPoints[] = [
  // round 1: plain race
  { round: 1, kind: "race", driverId: "a", familyName: "Alpha", constructorId: "mercedes", points: 25 },
  { round: 1, kind: "race", driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 18 },
  // round 2: sprint weekend — sprint and race are separate events
  { round: 2, kind: "sprint", driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 8 },
  { round: 2, kind: "race", driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 25 },
  { round: 2, kind: "race", driverId: "a", familyName: "Alpha", constructorId: "mercedes", points: 18 },
];

test("buildProgression makes sprints their own event, before the race", () => {
  const { events } = buildProgression(rows);
  expect(events.map((e) => e.label)).toEqual(["R1", "S2", "R2"]);
});

test("buildProgression accumulates per event for every driver", () => {
  const { lines } = buildProgression(rows);
  const beta = lines.find((l) => l.driverId === "b")!;
  expect(beta.cumulative).toEqual([18, 26, 51]);
  const alpha = lines.find((l) => l.driverId === "a")!;
  expect(alpha.cumulative).toEqual([25, 25, 43]); // no sprint points -> flat
});

test("buildProgression sorts lines by final total", () => {
  const { lines } = buildProgression(rows);
  expect(lines[0].driverId).toBe("b"); // 51 > 43
});
