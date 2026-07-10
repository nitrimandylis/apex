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
      const sessions = await getJsonCached(
        `/sessions?year=${year}&country_name=${encodeURIComponent(name)}&session_name=Race`,
      );
      const past = sessions.filter(
        (s: any) => new Date(s.date_start).getTime() < Date.now(),
      );
      if (past.length > 0) {
        session = past[past.length - 1];
        break;
      }
    }
    if (!session) {
      return null;
    }

    const drivers = await getJsonCached(
      `/drivers?session_key=${session.session_key}`,
    );
    if (drivers.length === 0) {
      return null;
    }
    const driverNumber = drivers[0].driver_number;

    const laps = await getJsonCached(
      `/laps?session_key=${session.session_key}&driver_number=${driverNumber}`,
    );
    const lap = laps.find(
      (l: any) => l.lap_number >= 2 && l.lap_duration !== null,
    );
    if (!lap) {
      return null;
    }

    const start = new Date(lap.date_start);
    const end = new Date(start.getTime() + lap.lap_duration * 1000);
    const points = await getJsonCached(
      `/location?session_key=${session.session_key}&driver_number=${driverNumber}` +
        `&date%3E${start.toISOString()}&date%3C${end.toISOString()}`,
    );

    if (points.length < 50) {
      return null;
    }
    return points.map((p: any) => ({ x: p.x, y: p.y }));
  } catch {
    // The map is decoration — never let OpenF1 downtime break the page.
    return null;
  }
}
