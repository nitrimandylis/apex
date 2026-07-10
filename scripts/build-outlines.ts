// Fetches one real lap of car position data for every circuit on the 2026
// calendar and writes lib/track-outlines.json. Run manually with:
//
//   bun scripts/build-outlines.ts
//
// Track shapes don't change, so this is a committed artifact instead of a
// runtime fetch — 22 circuits × ~6 requests would blow ISR timeouts on Vercel.

export {}; // top-level await needs module scope for the typechecker

const OPENF1 = "https://api.openf1.org/v1";

// Jolpica and OpenF1 disagree on some country names. Lookups use Jolpica's
// country to query OpenF1, but entries are keyed by Jolpica locality because
// one country can host several circuits (Spain ×2, USA ×3 in 2026).
const COUNTRY_ALIASES: Record<string, string> = {
  UK: "United Kingdom",
  USA: "United States",
  UAE: "United Arab Emirates",
};

async function getJson(url: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (res.status === 404) {
      return []; // OpenF1 uses 404 for empty result sets
    }
    throw new Error(`${url} -> ${res.status}`);
  }
  throw new Error(`${url} -> rate limited after retries`);
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Point = { x: number; y: number };
type RawSession = { session_key: number; location: string; date_start: string };
type Entry = { location: string; points: Point[] };

function sameCircuit(openF1Location: string, locality: string): boolean {
  const a = openF1Location.toLowerCase();
  const b = locality.toLowerCase();
  return a.includes(b) || b.includes(a);
}

// Latest past race session at this circuit, searching recent seasons.
async function findSession(
  country: string,
  locality: string,
  circuitsInCountry: number,
): Promise<RawSession | null> {
  const name = COUNTRY_ALIASES[country] ?? country;
  for (const year of [2026, 2025, 2024]) {
    const sessions: RawSession[] = await getJson(
      `${OPENF1}/sessions?year=${year}&country_name=${encodeURIComponent(name)}&session_name=Race`,
    );
    await pause(350);
    const past = sessions.filter(
      (s) => new Date(s.date_start).getTime() < Date.now(),
    );
    const matching = past.filter((s) => sameCircuit(s.location, locality));
    if (matching.length > 0) {
      return matching[matching.length - 1];
    }
    // Name mismatch (e.g. "Monte-Carlo" vs "Monaco") is only safe to ignore
    // when the country has a single circuit on the calendar.
    if (past.length > 0 && circuitsInCountry === 1) {
      return past[past.length - 1];
    }
  }
  return null;
}

async function outlineForSession(session: RawSession): Promise<Point[] | null> {
  const drivers = await getJson(
    `${OPENF1}/drivers?session_key=${session.session_key}`,
  );
  await pause(350);

  // Some drivers have no lap data for a session — try a few before giving up.
  let driverNumber = 0;
  let lap: { date_start: string; lap_duration: number } | undefined;
  for (const d of drivers.slice(0, 4)) {
    const laps = await getJson(
      `${OPENF1}/laps?session_key=${session.session_key}&driver_number=${d.driver_number}`,
    );
    await pause(350);
    lap = laps.find(
      (l: { lap_number: number; lap_duration: number | null }) =>
        l.lap_number >= 2 && l.lap_duration !== null,
    );
    if (lap) {
      driverNumber = d.driver_number;
      break;
    }
  }
  if (!lap) {
    return null;
  }

  const start = new Date(lap.date_start);
  const end = new Date(start.getTime() + lap.lap_duration * 1000);
  const points: Point[] = await getJson(
    `${OPENF1}/location?session_key=${session.session_key}&driver_number=${driverNumber}` +
      `&date%3E${start.toISOString()}&date%3C${end.toISOString()}`,
  );
  await pause(350);

  if (points.length < 50) {
    return null;
  }

  // Downsample to <=160 points — plenty for an outline, keeps the JSON small.
  const step = Math.ceil(points.length / 160);
  const sampled: Point[] = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push({ x: points[i].x, y: points[i].y });
  }
  return sampled;
}

const calendar = await getJson("https://api.jolpi.ca/ergast/f1/current.json");
const races = calendar.MRData.RaceTable.Races as {
  raceName: string;
  Circuit: { Location: { country: string; locality: string } };
}[];

const perCountry: Record<string, number> = {};
for (const race of races) {
  const c = race.Circuit.Location.country;
  perCountry[c] = (perCountry[c] ?? 0) + 1;
}

// Incremental: keep circuits already fetched by a previous run.
const existing = await Bun.file("lib/track-outlines.json")
  .json()
  .catch(() => ({}));
const outlines: Record<string, Entry> = existing;
for (const race of races) {
  const { country, locality } = race.Circuit.Location;
  if (outlines[locality]) {
    continue;
  }
  process.stdout.write(`${race.raceName} (${locality}, ${country})... `);
  try {
    const session = await findSession(country, locality, perCountry[country]);
    if (!session) {
      console.log("no past session — skipped");
      continue;
    }
    const points = await outlineForSession(session);
    if (points) {
      outlines[locality] = { location: session.location, points };
      console.log(`${points.length} points (${session.location})`);
    } else {
      console.log("no location data — skipped");
    }
  } catch (err) {
    console.log(`failed: ${err}`);
  }
}

await Bun.write(
  "lib/track-outlines.json",
  JSON.stringify(outlines, null, 1) + "\n",
);
console.log(
  `\nwrote lib/track-outlines.json with ${Object.keys(outlines).length} circuits`,
);
