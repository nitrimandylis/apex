import { expect, test } from "bun:test";
import { buildProgression, type RoundPoints } from "./progression";

const rows: RoundPoints[] = [
  // round 1: A wins, B second
  { round: 1, driverId: "a", familyName: "Alpha", constructorId: "mercedes", points: 25 },
  { round: 1, driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 18 },
  // round 2 is a sprint weekend: B takes sprint + race, A skips (DNS -> no row)
  { round: 2, driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 8 },
  { round: 2, driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 25 },
  // round 3: A wins again
  { round: 3, driverId: "a", familyName: "Alpha", constructorId: "mercedes", points: 25 },
  { round: 3, driverId: "b", familyName: "Beta", constructorId: "ferrari", points: 0 },
];

test("buildProgression accumulates race + sprint points per round", () => {
  const { rounds, lines } = buildProgression(rows, 5);
  expect(rounds).toEqual([1, 2, 3]);

  const beta = lines.find((l) => l.driverId === "b")!;
  expect(beta.cumulative).toEqual([18, 51, 51]); // 18, +8+25, +0

  const alpha = lines.find((l) => l.driverId === "a")!;
  expect(alpha.cumulative).toEqual([25, 25, 50]); // missing round counts 0
});

test("buildProgression sorts by final total and honors topN", () => {
  const { lines } = buildProgression(rows, 1);
  expect(lines.length).toBe(1);
  expect(lines[0].driverId).toBe("b"); // 51 > 50
});
