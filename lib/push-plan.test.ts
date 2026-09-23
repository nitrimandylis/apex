import { expect, test } from "bun:test";
import { planJobs } from "./push-plan";
import type { Race } from "./jolpica";

const baku: Race = {
  round: 17,
  name: "Azerbaijan Grand Prix",
  circuit: "",
  circuitId: "baku",
  locality: "Baku",
  country: "Azerbaijan",
  date: "2026-09-26",
  raceStart: "2026-09-26T11:00:00Z",
  sessions: [
    { label: "FP1", start: "2026-09-24T08:30:00Z" },
    { label: "QUALI", start: "2026-09-25T12:00:00Z" },
    { label: "RACE", start: "2026-09-26T11:00:00Z" },
  ],
};

test("a 30h window from Thursday morning catches quali, not the race", () => {
  const ids = planJobs([baku], new Date("2026-09-24T09:00:00Z"), 30).map(
    (j) => j.id,
  );
  expect(ids).toEqual(["reminder-17-QUALI", "result-17-QUALI"]);
});

test("preview lands one day before FP1, reminders 15 min early", () => {
  const jobs = planJobs([baku], new Date("2026-09-23T00:00:00Z"), 24 * 7);
  expect(jobs[0]).toMatchObject({ id: "preview-17", at: "2026-09-23T08:30:00.000Z" });
  const raceReminder = jobs.find((j) => j.id === "reminder-17-RACE");
  expect(raceReminder?.at).toBe("2026-09-26T10:45:00.000Z");
  const raceResult = jobs.find((j) => j.id === "result-17-RACE");
  expect(raceResult?.at).toBe("2026-09-26T13:00:00.000Z");
  expect(jobs.some((j) => j.label === "FP1")).toBe(false);
});
