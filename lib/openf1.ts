// Helpers for the OpenF1 API. Historical data is free and needs no key.

const BASE = "https://api.openf1.org/v1";
const WEEK = 604800;

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
