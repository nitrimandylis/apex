// Helpers for the OpenF1 API. Historical data is free and needs no key.

import { nameKey } from "./format";

const BASE = "https://api.openf1.org/v1";

// Raw row shapes as OpenF1 returns them (only the fields we read).
type RawSession = {
  session_key: number;
  session_name: string;
  location: string;
  country_name: string;
  date_start: string;
  date_end: string;
};
type RawDriver = {
  driver_number: number;
  name_acronym: string;
  last_name: string;
  team_name: string;
  headshot_url: string | null;
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

// ---- Client-side fetchers for the telemetry replay ----
// These run in the browser, so plain fetch with no Next cache options.

export type Session = {
  key: number;
  name: string;
  location: string;
  country: string;
  start: string;
  end: string;
  isRace: boolean;
};

export type OF1Driver = {
  number: number;
  acronym: string;
  lastName: string;
  teamName: string;
  headshot: string;
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
    country: s.country_name,
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
    headshot: d.headshot_url ?? "",
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

export type WeatherSample = {
  t: number;
  airTemp: number;
  trackTemp: number;
  rainfall: boolean;
  windSpeed: number;
};

export async function getWeather(key: number): Promise<WeatherSample[]> {
  type RawWeather = {
    date: string;
    air_temperature: number;
    track_temperature: number;
    rainfall: number;
    wind_speed: number;
  };
  const rows: RawWeather[] = await getJson(`/weather?session_key=${key}`);
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    airTemp: r.air_temperature,
    trackTemp: r.track_temperature,
    rainfall: r.rainfall > 0,
    windSpeed: r.wind_speed,
  }));
}

export type RaceControlMsg = {
  t: number;
  category: string;
  flag: string | null;
  message: string;
};

export async function getRaceControl(key: number): Promise<RaceControlMsg[]> {
  type RawRC = {
    date: string;
    category: string | null;
    flag: string | null;
    message: string;
  };
  const rows: RawRC[] = await getJson(`/race_control?session_key=${key}`);
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    category: r.category ?? "",
    flag: r.flag,
    message: r.message,
  }));
}

export type RadioClip = { t: number; driver: number; url: string };

export async function getTeamRadio(key: number): Promise<RadioClip[]> {
  type RawRadio = { date: string; driver_number: number; recording_url: string };
  let rows: RawRadio[];
  try {
    rows = await getJson(`/team_radio?session_key=${key}`);
  } catch {
    return []; // sessions without radio give 404 / "No results found"
  }
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    driver: r.driver_number,
    url: r.recording_url,
  }));
}

export type LocationSample = { t: number; x: number; y: number };

export async function getLocationWindow(
  key: number,
  driver: number,
  fromMs: number,
  toMs: number,
): Promise<LocationSample[]> {
  type RawLocation = { date: string; x: number; y: number };
  const from = new Date(fromMs).toISOString();
  const to = new Date(toMs).toISOString();
  let rows: RawLocation[];
  try {
    rows = await getJson(
      `/location?session_key=${key}&driver_number=${driver}` +
        `&date%3E${from}&date%3C${to}`,
    );
  } catch {
    return []; // empty window -> 404
  }
  return rows.map((r) => ({
    t: new Date(r.date).getTime(),
    x: r.x,
    y: r.y,
  }));
}

// Headshot URL per driver, keyed by lowercase last name. Server-side,
// cached daily — used to decorate Jolpica standings with faces.
export async function getHeadshots(): Promise<Record<string, string>> {
  try {
    const DAY = 86400;
    const res = await fetch(`${BASE}/sessions?year=2026&session_name=Race`, {
      next: { revalidate: DAY },
    });
    if (!res.ok) {
      return {};
    }
    const sessions: RawSession[] = await res.json();
    const past = sessions.filter(
      (s) => new Date(s.date_end).getTime() < Date.now(),
    );
    if (past.length === 0) {
      return {};
    }
    const key = past[past.length - 1].session_key;

    const dRes = await fetch(`${BASE}/drivers?session_key=${key}`, {
      next: { revalidate: DAY },
    });
    if (!dRes.ok) {
      return {};
    }
    const drivers: RawDriver[] = await dRes.json();

    const map: Record<string, string> = {};
    for (const d of drivers) {
      if (d.headshot_url) {
        map[nameKey(d.last_name)] = d.headshot_url;
      }
    }
    return map;
  } catch {
    return {}; // faces are decoration — never break a page over them
  }
}
