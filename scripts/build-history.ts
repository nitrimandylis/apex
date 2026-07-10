export {}; // top-level await needs module scope for the typechecker

// Fetches all-time F1 history (champions and race winners through last
// season) and writes lib/history.json. Past seasons never change, so this
// is a committed artifact. Rerun after a season ends:
//
//   bun scripts/build-history.ts

const BASE = "https://api.jolpi.ca/ergast/f1";
const THROUGH = 2025; // last completed season

async function getJson(url: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    throw new Error(`${url} -> ${res.status}`);
  }
  throw new Error(`${url} -> rate limited after retries`);
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Incremental: keep whatever a previous run already fetched.
type History = {
  through: number;
  champions: {
    year: number;
    name: string;
    familyName: string;
    team: string;
    constructorId: string;
  }[];
  constructorsChampions: { year: number; name: string; constructorId: string }[];
  winsByDriver: {
    driverId: string;
    name: string;
    familyName: string;
    constructorId: string; // team of their most recent win
    wins: number;
  }[];
};
const existing: Partial<History> = await Bun.file("lib/history.json")
  .json()
  .catch(() => ({}));

// ---- drivers' champions, one request per season ----
const champions = existing.champions ?? [];
const haveYears = new Set(champions.map((c) => c.year));
for (let year = 1950; year <= THROUGH; year++) {
  if (haveYears.has(year)) {
    continue;
  }
  const data = await getJson(`${BASE}/${year}/driverstandings/1.json`);
  await pause(400);
  const s = data.MRData.StandingsTable.StandingsLists[0].DriverStandings[0];
  champions.push({
    year,
    name: `${s.Driver.givenName} ${s.Driver.familyName}`,
    familyName: s.Driver.familyName,
    team: s.Constructors[0].name,
    constructorId: s.Constructors[0].constructorId,
  });
  process.stdout.write(`${year} ${s.Driver.familyName}  \r`);
}
champions.sort((a, b) => b.year - a.year);
console.log(`\nchampions: ${champions.length}`);

// ---- constructors' champions (first awarded 1958) ----
const teams = existing.constructorsChampions ?? [];
const haveTeamYears = new Set(teams.map((c) => c.year));
for (let year = 1958; year <= THROUGH; year++) {
  if (haveTeamYears.has(year)) {
    continue;
  }
  const data = await getJson(`${BASE}/${year}/constructorstandings/1.json`);
  await pause(400);
  const s = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings[0];
  teams.push({
    year,
    name: s.Constructor.name,
    constructorId: s.Constructor.constructorId,
  });
  process.stdout.write(`${year} ${s.Constructor.name}  \r`);
}
teams.sort((a, b) => b.year - a.year);
console.log(`\nconstructors champions: ${teams.length}`);

// ---- every race winner through THROUGH, aggregated per driver ----
type Agg = {
  driverId: string;
  name: string;
  familyName: string;
  constructorId: string;
  wins: number;
};
const byDriver = new Map<string, Agg>();
let offset = 0;
while (true) {
  const data = await getJson(`${BASE}/results/1.json?limit=100&offset=${offset}`);
  await pause(400);
  const races = data.MRData.RaceTable.Races;
  for (const race of races) {
    if (Number(race.season) > THROUGH) {
      continue; // current season merged at runtime instead
    }
    const w = race.Results[0];
    const id = w.Driver.driverId;
    const agg = byDriver.get(id) ?? {
      driverId: id,
      name: `${w.Driver.givenName} ${w.Driver.familyName}`,
      familyName: w.Driver.familyName,
      constructorId: w.Constructor.constructorId,
      wins: 0,
    };
    agg.wins++;
    agg.constructorId = w.Constructor.constructorId;
    byDriver.set(id, agg);
  }
  offset += 100;
  process.stdout.write(`winners: ${offset}/${data.MRData.total}  \r`);
  if (offset >= Number(data.MRData.total)) {
    break;
  }
}
const winsByDriver = [...byDriver.values()].sort((a, b) => b.wins - a.wins);
console.log(`\nrace winners: ${winsByDriver.length} distinct drivers`);

const history: History = {
  through: THROUGH,
  champions,
  constructorsChampions: teams,
  winsByDriver,
};
await Bun.write("lib/history.json", JSON.stringify(history, null, 1) + "\n");
console.log("wrote lib/history.json");
