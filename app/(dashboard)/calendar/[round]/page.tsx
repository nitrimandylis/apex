import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/page-header";
import TrackMap from "@/components/track-map";
import Countdown from "@/components/countdown";
import ScheduleStrip from "@/components/schedule-strip";
import Headshot from "@/components/headshot";
import FavRow from "@/components/fav-row";
import {
  getCalendar,
  getCircuitWinners,
  getRoundQualifying,
  getRoundResults,
  getRoundSprint,
  type RoundQualiRow,
  type RoundResultRow,
} from "@/lib/jolpica";
import {
  getHeadshots,
  getPitStops,
  getPositions,
  getRaceControl,
  getSessionResult,
  getWeather,
  getWeekendSessions,
  type RaceControlMsg,
  type Session,
  type SessionResultRow,
} from "@/lib/openf1";
import {
  keyMoments,
  leadChanges,
  safetyCars,
  winnersAndLosers,
  winningMargin,
  type Mover,
} from "@/lib/race-story";
import { formatElapsed, formatLapTime } from "@/lib/replay";
import { nameKey } from "@/lib/format";
import { TEAM_COLORS, colorForTeamName } from "@/lib/colors";
import { flagFor } from "@/lib/flags";
import { outlineFor } from "@/lib/outlines";
import { circuitTz } from "@/lib/timezones";

// Rendered on demand, not at build: prerendering 22 rounds at once fires
// ~150 OpenF1 requests in parallel and bakes 429-empty tables into the
// static HTML. On demand, each round's fetches are ISR-cached individually.

function Card({
  title,
  replayKey,
  children,
}: {
  title: string;
  replayKey?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-6 py-[22px] backdrop-blur-[18px] lg:px-7">
      <div className="mb-4 flex items-center">
        <div className="text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
          {title}
        </div>
        <div className="flex-1" />
        {replayKey && (
          <Link
            href={`/telemetry?session=${replayKey}`}
            className="text-xs font-semibold text-[#FF564E]/80 hover:text-[#FF564E]"
          >
            Replay this session →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function GridDelta({ grid, pos }: { grid: number; pos: number }) {
  if (grid === 0) {
    return <span className="text-[11px] text-[#F5F3F1]/40">PIT</span>;
  }
  const delta = grid - pos;
  if (delta === 0) {
    return <span className="text-[11px] text-[#F5F3F1]/35">—</span>;
  }
  return (
    <span
      className="text-[11px] font-semibold"
      style={{ color: delta > 0 ? "#43B02A" : "#FF564E" }}
    >
      {delta > 0 ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

// ---------- editorial sections ----------

function PodiumStep({
  row,
  size,
  big,
  headshots,
}: {
  row?: RoundResultRow;
  size: number;
  big?: boolean;
  headshots: Record<string, string>;
}) {
  if (!row) {
    return <div className="flex-1" />;
  }
  const color = TEAM_COLORS[row.constructorId] ?? "#B6BABD";
  return (
    <div
      className="flex flex-1 flex-col items-center gap-2 text-center"
      style={{ paddingTop: big ? 0 : 26 }}
    >
      <Headshot
        src={headshots[nameKey(row.familyName)] ?? ""}
        name={row.familyName}
        color={color}
        size={size}
      />
      <div>
        <div className="font-bold" style={{ fontSize: big ? 22 : 16 }}>
          {row.familyName}
        </div>
        <div className="text-[12px] text-[#F5F3F1]/50">{row.team}</div>
        <div
          className="mt-1 text-[12.5px] font-semibold"
          style={{ color: big ? "#FF564E" : "rgba(245,243,241,0.65)" }}
        >
          {big ? "WINNER" : row.time}
        </div>
      </div>
    </div>
  );
}

function PodiumHero({
  rows,
  raceName,
  headshots,
}: {
  rows: RoundResultRow[];
  raceName: string;
  headshots: Record<string, string>;
}) {
  const p1 = rows.find((r) => r.pos === 1);
  const p2 = rows.find((r) => r.pos === 2);
  const p3 = rows.find((r) => r.pos === 3);
  if (!p1) {
    return null;
  }
  const margin = winningMargin(rows);

  return (
    <div
      className="overflow-hidden rounded-[22px] border border-white/[0.08] px-7 py-7 backdrop-blur-[24px]"
      style={{
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015) 55%), rgba(10,10,13,0.6)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div className="mb-1 text-center text-[11px] font-bold tracking-[0.2em] text-[#FF4B42]">
        RACE REPORT
      </div>
      <div className="mb-5 text-center text-[26px] font-bold tracking-[-0.01em] lg:text-[30px]">
        {p1.familyName} wins the {raceName}
        {margin !== null && (
          <span className="text-[#F5F3F1]/50"> by {margin.toFixed(3)}s</span>
        )}
      </div>
      <div className="mx-auto flex max-w-[560px] items-start">
        <PodiumStep row={p2} size={64} headshots={headshots} />
        <PodiumStep row={p1} size={88} big headshots={headshots} />
        <PodiumStep row={p3} size={64} headshots={headshots} />
      </div>
    </div>
  );
}

function MoverRow({ m, gained }: { m: Mover; gained: boolean }) {
  const color = TEAM_COLORS[m.row.constructorId] ?? "#B6BABD";
  return (
    <FavRow
      familyName={m.row.familyName}
      background="rgba(255,255,255,0.02)"
      className="flex items-center gap-3 rounded-xl px-3 py-2"
    >
      <div className="h-4 w-[3px] rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1 truncate text-[14px] font-medium">
        {m.row.familyName}
      </div>
      {m.dnf ? (
        <div className="text-[12px] font-bold text-[#FF564E]">
          DNF from P{m.row.grid}
        </div>
      ) : (
        <div
          className="text-[12px] font-bold"
          style={{ color: gained ? "#43B02A" : "#FF564E" }}
        >
          P{m.row.grid} → P{m.row.pos}
          <span className="ml-1.5">
            {gained ? "▲" : "▼"}
            {Math.abs(m.delta)}
          </span>
        </div>
      )}
    </FavRow>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
      <div className="text-[10.5px] tracking-[0.18em] text-[#F5F3F1]/45">
        {label}
      </div>
      <div className="mt-1 text-[20px] leading-tight font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] text-[#F5F3F1]/45">{sub}</div>}
    </div>
  );
}

function MomentDot({ m }: { m: RaceControlMsg }) {
  const text = m.message.toUpperCase();
  let color = "rgba(245,243,241,0.4)";
  if (m.category === "SafetyCar") color = "#FFD12E";
  else if (text.includes("PENALTY") || m.flag === "RED") color = "#FF564E";
  else if (m.flag === "CHEQUERED") color = "#F5F3F1";
  return (
    <span
      className="mt-1.5 h-2 w-2 flex-none rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

// ---------- classification tables (unchanged layouts) ----------

function RaceTable({
  rows,
  headshots,
}: {
  rows: RoundResultRow[];
  headshots: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r, i) => (
        <FavRow
          key={r.familyName + r.pos}
          familyName={r.familyName}
          background={i % 2 === 0 ? "rgba(255,255,255,0.025)" : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-[7px]"
        >
          <div className="w-6 text-[13px] font-bold text-[#F5F3F1]/40">
            {r.pos}
          </div>
          <Headshot
            src={headshots[nameKey(r.familyName)] ?? ""}
            name={r.familyName}
            color={TEAM_COLORS[r.constructorId] ?? "#B6BABD"}
            size={26}
          />
          <div
            className="h-4 w-[3px] rounded-full"
            style={{ background: TEAM_COLORS[r.constructorId] ?? "#B6BABD" }}
          />
          <div className="w-[150px] truncate text-[14px] font-medium">
            {r.familyName}
            {r.fastestLap && (
              <span className="ml-1.5 align-middle text-[9px] font-bold tracking-[0.1em] text-[#B36BFF]">
                FL
              </span>
            )}
          </div>
          <div className="hidden min-w-0 flex-1 truncate text-[12.5px] text-[#F5F3F1]/45 sm:block">
            {r.team}
          </div>
          <div className="w-9 text-center">
            <GridDelta grid={r.grid} pos={r.pos} />
          </div>
          <div className="w-[104px] truncate text-right text-[12.5px] text-[#F5F3F1]/70">
            {r.time}
          </div>
          <div className="w-8 text-right text-[13.5px] font-bold">
            {r.points > 0 ? r.points : ""}
          </div>
        </FavRow>
      ))}
    </div>
  );
}

function QualiTable({
  rows,
  headshots,
}: {
  rows: RoundQualiRow[];
  headshots: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-3 text-[10px] tracking-[0.14em] text-[#F5F3F1]/35">
        <div className="w-6" />
        <div className="w-[26px]" />
        <div className="w-[3px]" />
        <div className="w-[150px]" />
        <div className="hidden min-w-0 flex-1 sm:block" />
        <div className="w-[72px] text-right">Q1</div>
        <div className="w-[72px] text-right">Q2</div>
        <div className="w-[72px] text-right">Q3</div>
      </div>
      {rows.map((r, i) => (
        <FavRow
          key={r.familyName + r.pos}
          familyName={r.familyName}
          background={i % 2 === 0 ? "rgba(255,255,255,0.025)" : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-[7px]"
        >
          <div className="w-6 text-[13px] font-bold text-[#F5F3F1]/40">
            {r.pos}
          </div>
          <Headshot
            src={headshots[nameKey(r.familyName)] ?? ""}
            name={r.familyName}
            color={TEAM_COLORS[r.constructorId] ?? "#B6BABD"}
            size={26}
          />
          <div
            className="h-4 w-[3px] rounded-full"
            style={{ background: TEAM_COLORS[r.constructorId] ?? "#B6BABD" }}
          />
          <div className="w-[150px] truncate text-[14px] font-medium">
            {r.familyName}
          </div>
          <div className="hidden min-w-0 flex-1 truncate text-[12.5px] text-[#F5F3F1]/45 sm:block">
            {r.team}
          </div>
          <div className="w-[72px] text-right text-[12.5px] text-[#F5F3F1]/55">
            {r.q1}
          </div>
          <div className="w-[72px] text-right text-[12.5px] text-[#F5F3F1]/55">
            {r.q2}
          </div>
          <div className="w-[72px] text-right text-[12.5px] font-semibold text-[#F5F3F1]/85">
            {r.q3}
          </div>
        </FavRow>
      ))}
    </div>
  );
}

function SessionTable({ rows }: { rows: SessionResultRow[] }) {
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r, i) => (
        <FavRow
          key={r.acronym + r.pos}
          familyName={r.lastName}
          background={i % 2 === 0 ? "rgba(255,255,255,0.025)" : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-[7px]"
        >
          <div className="w-6 text-[13px] font-bold text-[#F5F3F1]/40">
            {r.pos}
          </div>
          <Headshot
            src={r.headshot}
            name={r.lastName}
            color={colorForTeamName(r.teamName)}
            size={26}
          />
          <div
            className="h-4 w-[3px] rounded-full"
            style={{ background: colorForTeamName(r.teamName) }}
          />
          <div className="w-[150px] truncate text-[14px] font-medium">
            {r.lastName}
          </div>
          <div className="hidden min-w-0 flex-1 truncate text-[12.5px] text-[#F5F3F1]/45 sm:block">
            {r.teamName}
          </div>
          <div className="w-[84px] text-right text-[12.5px] text-[#F5F3F1]/70">
            {r.status !== "" ? r.status : formatLapTime(r.bestTime)}
          </div>
          <div className="w-[72px] text-right text-[12.5px] text-[#F5F3F1]/45">
            {r.pos === 1 || r.gap === null ? "" : `+${r.gap.toFixed(3)}`}
          </div>
          <div className="w-14 text-right text-[12px] text-[#F5F3F1]/40">
            {r.laps} laps
          </div>
        </FavRow>
      ))}
    </div>
  );
}

// ---------- page ----------

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round: roundParam } = await params;
  const round = Number(roundParam);
  const races = await getCalendar();
  const race = races.find((r) => r.round === round);
  if (!race) {
    notFound();
  }

  const now = new Date();
  const tz = circuitTz(race.locality);
  const outline = outlineFor(race.locality);
  const raceOver = new Date(race.raceStart).getTime() < now.getTime();

  const weekend = await getWeekendSessions(
    race.sessions[0]?.start ?? race.raceStart,
    race.raceStart,
  );
  const pastSessions = weekend.filter(
    (s) => new Date(s.end).getTime() < now.getTime(),
  );
  const isFullyFuture = pastSessions.length === 0;

  // Classification per past session, newest first (the race on top).
  const headshots = pastSessions.length > 0 ? await getHeadshots() : {};
  let raceRows: RoundResultRow[] = [];
  const cards: { session: Session; node: React.ReactNode }[] = [];
  for (const session of [...pastSessions].reverse()) {
    if (session.name === "Race") {
      const rows = await getRoundResults(round);
      if (rows.length > 0) {
        raceRows = rows;
        cards.push({
          session,
          node: <RaceTable rows={rows} headshots={headshots} />,
        });
        continue;
      }
    }
    if (session.name === "Sprint") {
      const rows = await getRoundSprint(round);
      if (rows.length > 0) {
        cards.push({
          session,
          node: <RaceTable rows={rows} headshots={headshots} />,
        });
        continue;
      }
    }
    if (session.name === "Qualifying") {
      const rows = await getRoundQualifying(round);
      if (rows.length > 0) {
        cards.push({
          session,
          node: <QualiTable rows={rows} headshots={headshots} />,
        });
        continue;
      }
    }
    // Practice, sprint quali, or a Jolpica gap: OpenF1 classification.
    const rows = await getSessionResult(session.key);
    if (rows.length > 0) {
      cards.push({ session, node: <SessionTable rows={rows} /> });
    }
  }

  // The editorial layer, once the race itself has data.
  const raceSession = pastSessions.find((s) => s.name === "Race");
  let movers: { winners: Mover[]; losers: Mover[] } | null = null;
  let moments: RaceControlMsg[] = [];
  let raceStartMs = 0;
  let stats: { label: string; value: string; sub?: string }[] = [];
  if (raceRows.length > 0 && raceSession) {
    const [raceControl, positions, pits, weather] = await Promise.all([
      getRaceControl(raceSession.key).catch(() => []),
      getPositions(raceSession.key).catch(() => []),
      getPitStops(raceSession.key).catch(() => []),
      getWeather(raceSession.key).catch(() => []),
    ]);
    raceStartMs = new Date(raceSession.start).getTime();
    movers = winnersAndLosers(raceRows);
    moments = keyMoments(raceControl);

    const fl = raceRows.find((r) => r.fastestLap);
    const pole = raceRows.find((r) => r.grid === 1);
    const margin = winningMargin(raceRows);
    const lanes = pits
      .map((p) => p.laneDuration)
      .filter((d): d is number => d !== null && d > 0);
    const trackTemps = weather.map((w) => w.trackTemp).filter((t) => t > 0);
    const rained = weather.some((w) => w.rainfall);

    stats = [
      {
        label: "WINNING MARGIN",
        value: margin !== null ? `${margin.toFixed(3)}s` : "—",
        sub: raceRows[1] ? `over ${raceRows[1].familyName}` : undefined,
      },
      {
        label: "FASTEST LAP",
        value: fl ? fl.familyName : "—",
      },
      {
        label: "POLE CONVERTED",
        value: pole ? `P1 → P${pole.pos}` : "—",
        sub: pole ? pole.familyName : undefined,
      },
      {
        label: "SAFETY CARS",
        value: String(safetyCars(raceControl)),
      },
      {
        label: "LEAD CHANGES",
        value: String(leadChanges(positions)),
      },
      {
        label: "PIT STOPS",
        value: String(pits.length),
        sub:
          lanes.length > 0
            ? `fastest lane ${Math.min(...lanes).toFixed(1)}s`
            : undefined,
      },
      {
        label: "HOTTEST TRACK",
        value:
          trackTemps.length > 0
            ? `${Math.max(...trackTemps).toFixed(1)}°`
            : "—",
        sub: rained ? "rain during the race" : "dry race",
      },
    ];
  }

  const winners = isFullyFuture ? await getCircuitWinners(race.circuitId, 5) : [];
  const futureSessions = race.sessions.filter(
    (s) => new Date(s.start).getTime() > now.getTime(),
  );

  const dateLine = new Date(race.raceStart).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });
  const timeLine = new Date(race.raceStart).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });

  return (
    <div>
      <PageHeader title={`${flagFor(race.country)} ${race.name}`}>
        <Link
          href="/calendar"
          className="text-[13px] text-[#F5F3F1]/45 hover:text-[#FF564E]"
        >
          ← Calendar
        </Link>
      </PageHeader>

      <div className="mb-6 text-[14px] text-[#F5F3F1]/55">
        Round {race.round} of {races.length} · {race.circuit} ·{" "}
        {raceOver ? `Raced ${dateLine}` : `${dateLine} · ${timeLine} local`}
      </div>

      <div className="flex flex-col gap-5">
        {raceRows.length > 0 && (
          <PodiumHero rows={raceRows} raceName={race.name} headshots={headshots} />
        )}

        {movers && (movers.winners.length > 0 || movers.losers.length > 0) && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="WINNERS · UP THE ORDER">
              <div className="flex flex-col gap-2">
                {movers.winners.map((m) => (
                  <MoverRow key={m.row.familyName} m={m} gained />
                ))}
              </div>
            </Card>
            <Card title="LOSERS · TOUGH SUNDAY">
              <div className="flex flex-col gap-2">
                {movers.losers.map((m) => (
                  <MoverRow key={m.row.familyName} m={m} gained={false} />
                ))}
              </div>
            </Card>
          </div>
        )}

        {stats.length > 0 && (
          <Card title="BY THE NUMBERS">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stats.map((s) => (
                <Stat key={s.label} label={s.label} value={s.value} sub={s.sub} />
              ))}
            </div>
          </Card>
        )}

        {moments.length > 0 && (
          <Card title="KEY MOMENTS">
            <div className="flex flex-col gap-2.5">
              {moments.map((m) => (
                <div key={m.t + m.message} className="flex items-start gap-3">
                  <MomentDot m={m} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] leading-snug text-[#F5F3F1]/80">
                      {m.message}
                    </div>
                    <div className="text-[10.5px] tracking-[0.1em] text-[#F5F3F1]/35">
                      {formatElapsed(m.t - raceStartMs)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isFullyFuture && (
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-7 py-6 backdrop-blur-[18px]">
              <div className="text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
                LIGHTS OUT
              </div>
              <Countdown targetIso={race.raceStart} />
              <div className="mt-6 flex-1">
                {outline ? (
                  <div className="h-[180px]">
                    <TrackMap points={outline} draw />
                  </div>
                ) : (
                  <div className="flex h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/[0.1] text-[13px] text-[#F5F3F1]/40">
                    New circuit — map appears after the first session here
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-7 py-6 backdrop-blur-[18px]">
              <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
                PAST WINNERS · {race.locality.toUpperCase()}
              </div>
              {winners.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#F5F3F1]/40">
                  No one has ever won here — first winner crowned this year.
                </div>
              ) : (
                <div className="flex flex-col gap-[5px]">
                  {winners.map((w) => (
                    <div
                      key={w.season}
                      className="flex items-center gap-3.5 rounded-xl px-3.5 py-2 hover:bg-white/[0.04]"
                    >
                      <div className="w-11 text-[13px] font-bold text-[#F5F3F1]/40">
                        {w.season}
                      </div>
                      <div
                        className="h-4 w-[3px] rounded-full"
                        style={{
                          background: TEAM_COLORS[w.constructorId] ?? "#B6BABD",
                        }}
                      />
                      <div className="text-[14.5px] font-medium">
                        {w.familyName}
                      </div>
                      <div className="flex-1" />
                      <div className="text-[12.5px] text-[#F5F3F1]/45">
                        {w.team}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {futureSessions.length > 0 && (
          <ScheduleStrip sessions={futureSessions} now={now.getTime()} tz={tz} />
        )}

        {cards.length > 0 && (
          <div className="mt-1 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/40">
            FULL CLASSIFICATIONS
          </div>
        )}
        {cards.map(({ session, node }) => (
          <Card
            key={session.key}
            title={session.name.toUpperCase()}
            replayKey={session.key}
          >
            {node}
          </Card>
        ))}
      </div>
    </div>
  );
}
