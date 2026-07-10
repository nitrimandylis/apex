// Typed fetchers for the Jolpica F1 API (the Ergast successor).
// All requests are cached server-side with ISR so visitors never
// hit the API directly (Jolpica asks not to be hammered).

const BASE = "https://api.jolpi.ca/ergast/f1";
const HOUR = 3600;
const WEEK = 604800;

export type Race = {
  round: number;
  name: string;
  circuit: string;
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

async function getJson(path: string, revalidate: number) {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`Jolpica ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function getCalendar(): Promise<Race[]> {
  const data = await getJson("/current.json", HOUR);
  const races = data.MRData.RaceTable.Races;

  return races.map((r: any) => {
    const sessions: { label: string; start: string }[] = [];
    const named = [
      ["FP1", r.FirstPractice],
      ["FP2", r.SecondPractice],
      ["FP3", r.ThirdPractice],
      ["QUALI", r.Qualifying],
      ["SPRINT", r.Sprint],
      ["RACE", { date: r.date, time: r.time }],
    ];
    for (const [label, s] of named) {
      if (s && s.date && s.time) {
        sessions.push({ label: label as string, start: `${s.date}T${s.time}` });
      }
    }
    return {
      round: Number(r.round),
      name: r.raceName,
      circuit: r.Circuit.circuitName,
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

  const standings = list.DriverStandings.map((s: any) => ({
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

  return list.ConstructorStandings.map((s: any) => ({
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

  const podium = race.Results.slice(0, 3).map((x: any) => ({
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

export async function getChampions(): Promise<Champion[]> {
  const years: number[] = [];
  for (let y = 2025; y >= 2016; y--) {
    years.push(y);
  }

  const champions = await Promise.all(
    years.map(async (year) => {
      const data = await getJson(`/${year}/driverstandings/1.json`, WEEK);
      const s = data.MRData.StandingsTable.StandingsLists[0].DriverStandings[0];
      return {
        year,
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        team: s.Constructors[0].name,
        constructorId: s.Constructors[0].constructorId,
      };
    }),
  );
  return champions;
}
