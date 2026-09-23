import { Receiver } from "@upstash/qstash";
import { getCalendar } from "@/lib/jolpica";
import { getSessionResult, getWeekendSessions } from "@/lib/openf1";
import { ALERT_SESSIONS } from "@/lib/push-plan";
import { claimOnce, queueJob, sendToAll, type JobMessage } from "@/lib/push";

// QStash calls this at each job's time. The payloads carry raw data; the
// service worker (public/sw.js) writes the words in the phone's own time
// zone. Only the favorite driver's line is filled in here, because the
// service worker cannot read localStorage.

const OPENF1_NAME: Record<string, string> = {
  QUALI: "Qualifying",
  SPRINT: "Sprint",
  RACE: "Race",
};

// Poll every 10 minutes for up to 6 hours after the expected end.
const RETRY_SECONDS = 600;
const MAX_ATTEMPTS = 36;

// "Hülkenberg" (Jolpica) vs "Hulkenberg" (OpenF1): compare without accents.
function plain(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function POST(request: Request) {
  // Only QStash may trigger alerts: check its signature on the raw body.
  // Built per request, not at import, so the build doesn't need the keys.
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY as string,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY as string,
  });
  const rawBody = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";
  const valid = await receiver
    .verify({ signature, body: rawBody })
    .catch(() => false);
  if (!valid) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const job: JobMessage = JSON.parse(rawBody);
  const races = await getCalendar();
  const race = races.find((r) => r.round === job.round);
  if (!race) {
    return Response.json({ skipped: "no such round" });
  }
  const raceName = race.name.replace(" Grand Prix", " GP");
  const url = `/calendar/${race.round}`;

  if (job.kind === "preview" || job.kind === "reminder") {
    if (!(await claimOnce(`apex:sent:${job.id}`))) {
      return Response.json({ skipped: "already sent" });
    }
    if (job.kind === "preview") {
      const sessions = race.sessions.filter((s) =>
        ALERT_SESSIONS.includes(s.label),
      );
      const sent = await sendToAll(() => ({ type: "preview", race: raceName, sessions, url }));
      return Response.json({ sent });
    }
    const session = race.sessions.find((s) => s.label === job.label);
    const sent = await sendToAll(() => ({
      type: "reminder",
      race: raceName,
      label: job.label,
      start: session?.start,
      url,
    }));
    return Response.json({ sent });
  }

  // Result: find the OpenF1 session, then ask for its classification
  // uncached. Empty means not published yet, so come back in 10 minutes.
  const weekend = await getWeekendSessions(race.sessions[0].start, race.raceStart);
  const session = weekend.find((s) => s.name === OPENF1_NAME[job.label]);
  const rows = session ? await getSessionResult(session.key, 0) : [];

  if (rows.length === 0) {
    if (job.attempt + 1 < MAX_ATTEMPTS) {
      await queueJob({ ...job, attempt: job.attempt + 1 }, RETRY_SECONDS);
      return Response.json({ retry: job.attempt + 1 });
    }
    return Response.json({ gaveUp: true });
  }

  if (!(await claimOnce(`apex:sent:${job.id}`))) {
    return Response.json({ skipped: "already sent" });
  }
  // Logged so Baku tells us how long OpenF1 takes after the session.
  console.log(`result ${job.id} found on attempt ${job.attempt}`);

  const top3 = rows.slice(0, 3).map((r) => r.lastName);
  const sent = await sendToAll((favorite) => {
    let you: string | undefined;
    const row = rows.find((r) => favorite && plain(r.lastName) === plain(favorite));
    if (row && row.pos > 3) {
      you = `${row.lastName} ${row.status || `P${row.pos}`}`;
    }
    return { type: "result", race: raceName, label: job.label, top3, you, url };
  });
  return Response.json({ sent });
}
