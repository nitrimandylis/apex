// Helpers for the OpenF1 API. Historical data is free and needs no key.

const BASE = "https://api.openf1.org/v1";
const WEEK = 604800;

// Jolpica and OpenF1 disagree on some country names.
// ponytail: name alias map; if a circuit still has no match the caller falls back.
const COUNTRY_ALIASES: Record<string, string> = {
  UK: "Great Britain",
  USA: "United States",
  UAE: "United Arab Emirates",
};

type LocationPoint = { x: number; y: number };

// Raw row shapes as OpenF1 returns them (only the fields we read).
type RawSession = {
  session_key: number;
  session_name: string;
  location: string;
  date_start: string;
  date_end: string;
};
type RawDriver = {
  driver_number: number;
  name_acronym: string;
  last_name: string;
  team_name: string;
};
type RawCar = {
  date: string;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
};
type RawPos = { date: string; driver_number: number; position: number };
type RawStint = {
  driver_number: number;
  lap_start: number;
  lap_end: number;
  compound: string | null;
};
type RawLap = {
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
};
type RawInterval = {
  date: string;
  driver_number: number;
  gap_to_leader: number | null;
};

async function getJsonCached(path: string) {
  // OpenF1 rate-limits bursts; wait and retry on 429 (only hit on cold cache).
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: WEEK } });
    if (res.ok) {
      return res.json();
    }
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    throw new Error(`OpenF1 ${path} failed: ${res.status}`);
  }
  throw new Error(`OpenF1 ${path} failed: rate limited after retries`);
}

// One lap of real car position data at the given country's circuit,
// from the most recent race held there. Null when no data exists yet
// (e.g. a brand-new circuit before its first weekend).
export async function getTrackOutline(
  country: string,
): Promise<LocationPoint[] | null> {
  try {
    const name = COUNTRY_ALIASES[country] ?? country;

    let session: { session_key: number; date_start: string } | null = null;
    for (const year of [2026, 2025, 2024]) {
      const sessions: RawSession[] = await getJsonCached(
        `/sessions?year=${year}&country_name=${encodeURIComponent(name)}&session_name=Race`,
      );
      const past = sessions.filter(
        (s) => new Date(s.date_start).getTime() < Date.now(),
      );
      if (past.length > 0) {
        session = past[past.length - 1];
        break;
      }
    }
    if (!session) {
      return null;
    }

    const drivers: RawDriver[] = await getJsonCached(
      `/drivers?session_key=${session.session_key}`,
    );
    if (drivers.length === 0) {
      return null;
    }
    const driverNumber = drivers[0].driver_number;

    const laps: RawLap[] = await getJsonCached(
      `/laps?session_key=${session.session_key}&driver_number=${driverNumber}`,
    );
    const lap = laps.find(
      (l) => l.lap_number >= 2 && l.lap_duration !== null,
    );
    if (!lap) {
      return null;
    }

    const start = new Date(lap.date_start);
    const end = new Date(start.getTime() + (lap.lap_duration ?? 0) * 1000);
    const points: LocationPoint[] = await getJsonCached(
      `/location?session_key=${session.session_key}&driver_number=${driverNumber}` +
        `&date%3E${start.toISOString()}&date%3C${end.toISOString()}`,
    );

    if (points.length < 50) {
      return null;
    }
    return points.map((p) => ({ x: p.x, y: p.y }));
  } catch {
    // The map is decoration — never let OpenF1 downtime break the page.
    return null;
  }
}

// ---- Client-side fetchers for the telemetry replay ----
// These run in the browser, so plain fetch with no Next cache options.

export type Session = {
  key: number;
  name: string;
  location: string;
  start: string;
  end: string;
  isRace: boolean;
};

export type OF1Driver = {
  number: number;
  acronym: string;
  lastName: string;
  teamName: string;
};

export type CarSample = {
  t: number; // ms since epoch
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
};

export type PosSample = { t: number; driver: number; position: number };
export type Stint = {
  driver: number;
  lapStart: number;
  lapEnd: number;
  compound: string;
};
export type Lap = { lap: number; t: number; duration: number | null };
export type IntervalSample = {
  t: number;
  driver: number;
  gapToLeader: number | null;
};

async function getJson(path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) {
      return res.json();
    }
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    throw new Error(`OpenF1 ${path} failed: ${res.status}`);
  }
  throw new Error(`OpenF1 ${path} failed: rate limited after retries`);
}

// Every session already run this season (plus last season as a fallback),
// newest first.
export async function getPastSessions(): Promise<Session[]> {
  // Data turns free/historical 30 minutes after a session ends, so only
  // offer sessions past that margin.
  const cutoff = Date.now() - 30 * 60 * 1000;
  let sessions: RawSession[] = await getJson("/sessions?year=2026");
  sessions = sessions.filter((s) => new Date(s.date_end).getTime() < cutoff);
  if (sessions.length === 0) {
    sessions = await getJson("/sessions?year=2025");
  }
  sessions.sort(
    (a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
  );
  return sessions.map((s) => ({
    key: s.session_key,
    name: s.session_name,
    location: s.location,
    start: s.date_start,
    end: s.date_end,
    isRace: s.session_name === "Race" || s.session_name === "Sprint",
  }));
}

export async function getSessionDrivers(key: number): Promise<OF1Driver[]> {
  const drivers: RawDriver[] = await getJson(`/drivers?session_key=${key}`);
  return drivers.map((d) => ({
    number: d.driver_number,
    acronym: d.name_acronym,
    lastName: d.last_name,
    teamName: d.team_name,
  }));
}

export async function getCarData(
  key: number,
  driver: number,
  fromIso: string,
  toIso: string,
): Promise<CarSample[]> {
  // Bounded to the session window: OpenF1 sometimes stores stray samples
  // from the day before, which would break the replay clock.
  const rows: RawCar[] = await getJson(
    `/car_data?session_key=${key}&driver_number=${driver}` +
      `&date%3E${fromIso}&date%3C${toIso}`,
  );
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    speed: r.speed,
    gear: r.n_gear,
    throttle: r.throttle,
    brake: r.brake,
  }));
}

export async function getPositions(key: number): Promise<PosSample[]> {
  const rows: RawPos[] = await getJson(`/position?session_key=${key}`);
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    driver: r.driver_number,
    position: r.position,
  }));
}

// All drivers' stints for the session in one request.
export async function getStints(key: number): Promise<Stint[]> {
  const rows: RawStint[] = await getJson(`/stints?session_key=${key}`);
  return rows.map((r) => ({
    driver: r.driver_number,
    lapStart: r.lap_start,
    lapEnd: r.lap_end,
    compound: r.compound ?? "",
  }));
}

export async function getLaps(key: number, driver: number): Promise<Lap[]> {
  const rows: RawLap[] = await getJson(
    `/laps?session_key=${key}&driver_number=${driver}`,
  );
  return rows.map((r) => ({
    lap: r.lap_number,
    t: new Date(r.date_start).getTime(),
    duration: r.lap_duration,
  }));
}

export async function getIntervalWindow(
  key: number,
  fromMs: number,
  toMs: number,
): Promise<IntervalSample[]> {
  const from = new Date(fromMs).toISOString();
  const to = new Date(toMs).toISOString();
  let rows: RawInterval[];
  try {
    rows = await getJson(
      `/intervals?session_key=${key}&date%3E${from}&date%3C${to}`,
    );
  } catch {
    // OpenF1 answers 404 for an empty window — treat as no data.
    return [];
  }
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    driver: r.driver_number,
    gapToLeader: typeof r.gap_to_leader === "number" ? r.gap_to_leader : null,
  }));
}
