// Pure championship-points math for the progression chart. No fetching.

export type RoundPoints = {
  round: number;
  driverId: string;
  familyName: string;
  constructorId: string;
  points: number;
};

export type ProgressionLine = {
  driverId: string;
  familyName: string;
  constructorId: string;
  cumulative: number[]; // index 0 = after round 1
};

// Sums race + sprint points per driver per round and accumulates them.
// Returns the top N drivers by final total, best first.
export function buildProgression(
  rows: RoundPoints[],
  topN: number,
): { rounds: number[]; lines: ProgressionLine[] } {
  const lastRound = rows.reduce((max, r) => Math.max(max, r.round), 0);
  const rounds: number[] = [];
  for (let r = 1; r <= lastRound; r++) {
    rounds.push(r);
  }

  type Acc = {
    familyName: string;
    constructorId: string;
    perRound: number[];
  };
  const byDriver = new Map<string, Acc>();

  for (const row of rows) {
    let acc = byDriver.get(row.driverId);
    if (!acc) {
      acc = {
        familyName: row.familyName,
        constructorId: row.constructorId,
        perRound: new Array(lastRound).fill(0),
      };
      byDriver.set(row.driverId, acc);
    }
    // A driver has up to two rows per round (race + sprint) — add both.
    acc.perRound[row.round - 1] += row.points;
    // Track the latest team in case of a mid-season swap.
    acc.constructorId = row.constructorId;
  }

  const lines: ProgressionLine[] = [...byDriver.entries()].map(
    ([driverId, acc]) => {
      const cumulative: number[] = [];
      let total = 0;
      for (const pts of acc.perRound) {
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
  return { rounds, lines: lines.slice(0, topN) };
}
