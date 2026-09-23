import type { Race } from "./jolpica";

// Pure scheduling for push alerts: which jobs fall due in the next window.
// The daily cron runs this and hands each job to QStash with its time.
// Kept free of fetching so the bun test can drive it with fixed dates.

export type Job = {
  id: string; // stable, so a job queued by yesterday's run is never queued twice
  kind: "preview" | "reminder" | "result";
  round: number;
  label: string; // "QUALI" | "SPRINT" | "RACE", or "WEEKEND" for the preview
  at: string; // ISO time QStash should deliver the job
};

export const ALERT_SESSIONS = ["QUALI", "SPRINT", "RACE"];

// Roughly how long each session runs; the first result check starts here.
const LENGTH_MINUTES: Record<string, number> = {
  QUALI: 60,
  SPRINT: 60,
  RACE: 120,
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export function planJobs(races: Race[], now: Date, windowHours: number): Job[] {
  const from = now.getTime();
  const to = from + windowHours * HOUR;
  const jobs: Job[] = [];

  function add(job: Job) {
    const t = new Date(job.at).getTime();
    if (t >= from && t < to) {
      jobs.push(job);
    }
  }

  for (const race of races) {
    // Preview: one day before the weekend's first session.
    if (race.sessions.length > 0) {
      const first = new Date(race.sessions[0].start).getTime();
      add({
        id: `preview-${race.round}`,
        kind: "preview",
        round: race.round,
        label: "WEEKEND",
        at: new Date(first - 24 * HOUR).toISOString(),
      });
    }

    for (const session of race.sessions) {
      if (!ALERT_SESSIONS.includes(session.label)) {
        continue;
      }
      const start = new Date(session.start).getTime();
      add({
        id: `reminder-${race.round}-${session.label}`,
        kind: "reminder",
        round: race.round,
        label: session.label,
        at: new Date(start - 15 * MINUTE).toISOString(),
      });
      add({
        id: `result-${race.round}-${session.label}`,
        kind: "result",
        round: race.round,
        label: session.label,
        at: new Date(start + LENGTH_MINUTES[session.label] * MINUTE).toISOString(),
      });
    }
  }

  return jobs;
}
