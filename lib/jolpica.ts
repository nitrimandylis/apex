// Typed fetchers for the Jolpica F1 API (the Ergast successor).
// All requests are cached server-side with ISR so visitors never
// hit the API directly (Jolpica asks not to be hammered).

import type { RoundPoints } from "./progression";

const BASE = "https://api.jolpi.ca/ergast/f1";
const HOUR = 3600;
const WEEK = 604800;

export type Race = {
  round: number;
  name: string;
  circuit: string;
  circuitId: string;
  locality: string;
  country: string;
  date: string; // race day, YYYY-MM-DD
  raceStart: string; // full ISO datetime of lights out
  sessions: { label: string; start: string }[];
};

export type DriverStanding = {
  pos: number;
  name: string;
  familyName: string;
  team: string;
  constructorId: string;
  points: number;
  wins: number;
};

export type ConstructorStanding = {
  pos: number;
  name: string;
  constructorId: string;
  points: number;
};

export type RaceResult = {
  pos: number;
  familyName: string;
  constructorId: string;
  time: string;
};

export type Champion = {
  year: number;
  name: string;
  team: string;
  constructorId: string;
};

// Raw shapes as Jolpica returns them (only the fields we read).
// Numbers arrive as strings, e.g. points: "179".
type RawSessionTime = { date?: string; time?: string };
type RawRace = {
  round: string;
  raceName: string;
  date: string;
  time: string;
  Circuit: {
    circuitName: string;
    circuitId: string;
    Location: { locality: string; country: string };
  };
  FirstPractice?: RawSessionTime;
  SecondPractice?: RawSessionTime;
  ThirdPractice?: RawSessionTime;
  Qualifying?: RawSessionTime;
  Sprint?: RawSessionTime;
};
type RawDriverStanding = {
  position: string;
  points: string;
  wins: string;
  Driver: { givenName: string; familyName: string };
  Constructors: { name: string; constructorId: string }[];
};
type RawConstructorStanding = {
  position: string;
  points: string;
  Constructor: { name: string; constructorId: string };
};
type RawResult = {
  position: string;
  status: string;
  Time?: { time: string };
  Driver: { familyName: string };
  Constructor: { constructorId: string };
};

async function getJson(path: string, revalidate: number) {
  // Jolpica's free tier allows ~4 requests per second; on a cold cache we
  // can trip it, so wait and retry a couple of times on 429.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
    if (res.ok) {
      return res.json();
    }
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }
    throw new Error(`Jolpica ${path} failed: ${res.status}`);
  }
  throw new Error(`Jolpica ${path} failed: rate limited after retries`);
}

export async function getCalendar(): Promise<Race[]> {
  const data = await getJson("/current.json", HOUR);
  const races: RawRace[] = data.MRData.RaceTable.Races;

  return races.map((r) => {
    const sessions: { label: string; start: string }[] = [];
    const named: [string, RawSessionTime | undefined][] = [
      ["FP1", r.FirstPractice],
      ["FP2", r.SecondPractice],
      ["FP3", r.ThirdPractice],
      ["QUALI", r.Qualifying],
      ["SPRINT", r.Sprint],
      ["RACE", { date: r.date, time: r.time }],
    ];
    for (const [label, s] of named) {
      if (s && s.date && s.time) {
        sessions.push({ label, start: `${s.date}T${s.time}` });
      }
    }
    return {
      round: Number(r.round),
      name: r.raceName,
      circuit: r.Circuit.circuitName,
      circuitId: r.Circuit.circuitId,
      locality: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      date: r.date,
      raceStart: `${r.date}T${r.time}`,
      sessions,
    };
  });
}

export async function getDriverStandings(): Promise<{
  round: number;
  standings: DriverStanding[];
}> {
  const data = await getJson("/current/driverstandings.json", HOUR);
  const list = data.MRData.StandingsTable.StandingsLists[0];

  const standings = list.DriverStandings.map((s: RawDriverStanding) => ({
    pos: Number(s.position),
    name: `${s.Driver.givenName} ${s.Driver.familyName}`,
    familyName: s.Driver.familyName,
    team: s.Constructors[0].name,
    constructorId: s.Constructors[0].constructorId,
    points: Number(s.points),
    wins: Number(s.wins),
  }));

  return { round: Number(list.round), standings };
}

export async function getConstructorStandings(): Promise<
  ConstructorStanding[]
> {
  const data = await getJson("/current/constructorstandings.json", HOUR);
  const list = data.MRData.StandingsTable.StandingsLists[0];

  return list.ConstructorStandings.map((s: RawConstructorStanding) => ({
    pos: Number(s.position),
    name: s.Constructor.name,
    constructorId: s.Constructor.constructorId,
    points: Number(s.points),
  }));
}

export async function getLastRace(): Promise<{
  name: string;
  circuit: string;
  date: string;
  podium: RaceResult[];
}> {
  const data = await getJson("/current/last/results.json", HOUR);
  const race = data.MRData.RaceTable.Races[0];

  const podium = race.Results.slice(0, 3).map((x: RawResult) => ({
    pos: Number(x.position),
    familyName: x.Driver.familyName,
    constructorId: x.Constructor.constructorId,
    time: x.Time ? x.Time.time : x.status,
  }));

  return {
    name: race.raceName,
    circuit: race.Circuit.circuitName,
    date: race.date,
    podium,
  };
}

// Winner of every completed round this season, for the calendar tags.
export async function getSeasonWinners(): Promise<
  Record<number, { familyName: string; constructorId: string }>
> {
  const data = await getJson("/current/results/1.json", HOUR);
  const winners: Record<number, { familyName: string; constructorId: string }> =
    {};

  for (const race of data.MRData.RaceTable.Races) {
    const first = race.Results[0];
    winners[Number(race.round)] = {
      familyName: first.Driver.familyName,
      constructorId: first.Constructor.constructorId,
    };
  }
  return winners;
}

export type QualiResult = {
  pos: number;
  familyName: string;
  constructorId: string;
  time: string;
};

export async function getQualifying(): Promise<{
  raceName: string;
  results: QualiResult[];
}> {
  const data = await getJson("/current/last/qualifying.json", HOUR);
  const race = data.MRData.RaceTable.Races[0];

  type RawQuali = {
    position: string;
    Q1?: string;
    Q2?: string;
    Q3?: string;
    Driver: { familyName: string };
    Constructor: { constructorId: string };
  };
  const results = race.QualifyingResults.map((q: RawQuali) => ({
    pos: Number(q.position),
    familyName: q.Driver.familyName,
    constructorId: q.Constructor.constructorId,
    time: q.Q3 ?? q.Q2 ?? q.Q1 ?? "—",
  }));

  return { raceName: race.raceName, results };
}

// Every points-scoring row of the season (race + sprint), flattened for
// the progression chart. Paginated: Jolpica caps limit at 100 rows.
export async function getSeasonPoints(): Promise<RoundPoints[]> {
  type RawPage = {
    MRData: {
      total: string;
      RaceTable: {
        Races: {
          round: string;
          Results?: RawResult2[];
          SprintResults?: RawResult2[];
        }[];
      };
    };
  };
  type RawResult2 = {
    points: string;
    Driver: { driverId: string; familyName: string };
    Constructor: { constructorId: string };
  };

  const rows: RoundPoints[] = [];

  async function collect(path: string, key: "Results" | "SprintResults") {
    let offset = 0;
    while (true) {
      const page: RawPage = await getJson(
        `${path}?limit=100&offset=${offset}`,
        HOUR,
      );
      for (const race of page.MRData.RaceTable.Races) {
        for (const r of race[key] ?? []) {
          rows.push({
            round: Number(race.round),
            driverId: r.Driver.driverId,
            familyName: r.Driver.familyName,
            constructorId: r.Constructor.constructorId,
            points: Number(r.points),
          });
        }
      }
      offset += 100;
      if (offset >= Number(page.MRData.total)) {
        break;
      }
    }
  }

  // Sequential to respect Jolpica's rate limit.
  await collect("/current/results.json", "Results");
  await collect("/current/sprint.json", "SprintResults");
  return rows;
}

export async function getChampions(): Promise<Champion[]> {
  const years: number[] = [];
  for (let y = 2025; y >= 2016; y--) {
    years.push(y);
  }

  // Sequential on purpose: ten parallel requests trip Jolpica's rate limit.
  // This only runs when the weekly cache is cold.
  const champions: Champion[] = [];
  for (const year of years) {
    const data = await getJson(`/${year}/driverstandings/1.json`, WEEK);
    const s = data.MRData.StandingsTable.StandingsLists[0].DriverStandings[0];
    champions.push({
      year,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      team: s.Constructors[0].name,
      constructorId: s.Constructors[0].constructorId,
    });
  }
  return champions;
}

// ---- Per-round session results for the race detail pages ----

export type RoundResultRow = {
  pos: number;
  familyName: string;
  fullName: string;
  constructorId: string;
  team: string;
  grid: number; // 0 = pit-lane start
  time: string; // winner absolute, others gap, else status
  points: number;
  fastestLap: boolean;
};

type RawRoundResult = RawResult & {
  grid: string;
  points: string;
  Driver: { givenName: string; familyName: string };
  Constructor: { constructorId: string; name: string };
  FastestLap?: { rank: string };
};

function mapResultRows(rows: RawRoundResult[]): RoundResultRow[] {
  return rows.map((x) => ({
    pos: Number(x.position),
    familyName: x.Driver.familyName,
    fullName: `${x.Driver.givenName} ${x.Driver.familyName}`,
    constructorId: x.Constructor.constructorId,
    team: x.Constructor.name,
    grid: Number(x.grid),
    time: x.Time ? x.Time.time : x.status,
    points: Number(x.points),
    fastestLap: x.FastestLap?.rank === "1",
  }));
}

// Empty array when the session has no data yet (or the round has no sprint).
async function getRoundTable(path: string, key: string): Promise<RawRoundResult[]> {
  try {
    const data = await getJson(path, HOUR);
    const races = data.MRData.RaceTable.Races;
    if (races.length === 0) {
      return [];
    }
    return races[0][key] ?? [];
  } catch {
    return [];
  }
}

export async function getRoundResults(round: number): Promise<RoundResultRow[]> {
  return mapResultRows(await getRoundTable(`/current/${round}/results.json`, "Results"));
}

export async function getRoundSprint(round: number): Promise<RoundResultRow[]> {
  return mapResultRows(await getRoundTable(`/current/${round}/sprint.json`, "SprintResults"));
}

export type RoundQualiRow = {
  pos: number;
  familyName: string;
  fullName: string;
  constructorId: string;
  team: string;
  q1: string;
  q2: string;
  q3: string;
};

export async function getRoundQualifying(round: number): Promise<RoundQualiRow[]> {
  type RawQ = {
    position: string;
    Q1?: string;
    Q2?: string;
    Q3?: string;
    Driver: { givenName: string; familyName: string };
    Constructor: { constructorId: string; name: string };
  };
  const rows: RawQ[] = await getRoundTable(
    `/current/${round}/qualifying.json`,
    "QualifyingResults",
  );
  return rows.map((q) => ({
    pos: Number(q.position),
    familyName: q.Driver.familyName,
    fullName: `${q.Driver.givenName} ${q.Driver.familyName}`,
    constructorId: q.Constructor.constructorId,
    team: q.Constructor.name,
    q1: q.Q1 ?? "—",
    q2: q.Q2 ?? "—",
    q3: q.Q3 ?? "—",
  }));
}

export type CircuitWinner = {
  season: number;
  familyName: string;
  constructorId: string;
  team: string;
};

// Last n winners at a circuit, newest first (Spa has 58 all-time races).
export async function getCircuitWinners(
  circuitId: string,
  n: number,
): Promise<CircuitWinner[]> {
  try {
    const head = await getJson(`/circuits/${circuitId}/results/1.json?limit=1`, WEEK);
    const total = Number(head.MRData.total);
    if (total === 0) {
      return [];
    }
    const offset = Math.max(0, total - n);
    const data = await getJson(
      `/circuits/${circuitId}/results/1.json?limit=${n}&offset=${offset}`,
      WEEK,
    );
    const races = data.MRData.RaceTable.Races as {
      season: string;
      Results: RawRoundResult[];
    }[];
    return races
      .map((r) => ({
        season: Number(r.season),
        familyName: r.Results[0].Driver.familyName,
        constructorId: r.Results[0].Constructor.constructorId,
        team: r.Results[0].Constructor.name,
      }))
      .reverse();
  } catch {
    return [];
  }
}
