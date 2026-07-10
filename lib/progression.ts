// Pure championship-points math for the progression chart. No fetching.

export type RoundPoints = {
  round: number;
  kind: "race" | "sprint";
  driverId: string;
  familyName: string;
  constructorId: string;
  points: number;
};

// One x-axis position: a sprint or a race. Sprints come before their race.
export type SeasonEvent = {
  round: number;
  kind: "race" | "sprint";
  label: string; // "R9" or "S9"
};

export type ProgressionLine = {
  driverId: string;
  familyName: string;
  constructorId: string;
  cumulative: number[]; // one value per SeasonEvent
};

// Cumulative points per driver after every scoring event of the season,
// for ALL drivers, sorted by final total (best first). The chart decides
// which lines to show.
export function buildProgression(rows: RoundPoints[]): {
  events: SeasonEvent[];
  lines: ProgressionLine[];
} {
  // Distinct events in racing order: by round, sprint before race.
  const seen = new Set<string>();
  const events: SeasonEvent[] = [];
  for (const row of rows) {
    const id = `${row.round}-${row.kind}`;
    if (!seen.has(id)) {
      seen.add(id);
      events.push({
        round: row.round,
        kind: row.kind,
        label: `${row.kind === "sprint" ? "S" : "R"}${row.round}`,
      });
    }
  }
  events.sort((a, b) => {
    if (a.round !== b.round) {
      return a.round - b.round;
    }
    return a.kind === "sprint" ? -1 : 1;
  });
  const eventIndex = new Map(
    events.map((e, i) => [`${e.round}-${e.kind}`, i]),
  );

  type Acc = {
    familyName: string;
    constructorId: string;
    perEvent: number[];
  };
  const byDriver = new Map<string, Acc>();
  for (const row of rows) {
    let acc = byDriver.get(row.driverId);
    if (!acc) {
      acc = {
        familyName: row.familyName,
        constructorId: row.constructorId,
        perEvent: new Array(events.length).fill(0),
      };
      byDriver.set(row.driverId, acc);
    }
    acc.perEvent[eventIndex.get(`${row.round}-${row.kind}`) ?? 0] += row.points;
    acc.constructorId = row.constructorId; // track mid-season team swaps
  }

  const lines: ProgressionLine[] = [...byDriver.entries()].map(
    ([driverId, acc]) => {
      const cumulative: number[] = [];
      let total = 0;
      for (const pts of acc.perEvent) {
        total += pts;
        cumulative.push(total);
      }
      return {
        driverId,
        familyName: acc.familyName,
        constructorId: acc.constructorId,
        cumulative,
      };
    },
  );

  lines.sort(
    (a, b) =>
      b.cumulative[b.cumulative.length - 1] -
      a.cumulative[a.cumulative.length - 1],
  );
  return { events, lines };
}
