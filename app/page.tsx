import Link from "next/link";
import PageHeader from "@/components/page-header";
import Countdown from "@/components/countdown";
import TrackMap from "@/components/track-map";
import { outlineFor } from "@/lib/outlines";
import Headshot from "@/components/headshot";
import ScheduleStrip from "@/components/schedule-strip";
import { getHeadshots } from "@/lib/openf1";
import {
  getCalendar,
  getConstructorStandings,
  getDriverStandings,
  getLastRace,
  getQualifying,
} from "@/lib/jolpica";
import { nameKey, nextRace } from "@/lib/format";
import { TEAM_COLORS } from "@/lib/colors";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
      {children}
    </div>
  );
}

export default async function OverviewPage() {
  const [races, { round, standings }, constructors, lastRace] =
    await Promise.all([
      getCalendar(),
      getDriverStandings(),
      getConstructorStandings(),
      getLastRace(),
    ]);
  const quali = await getQualifying().catch(() => null);
  const headshots = await getHeadshots();

  const now = new Date();
  const next = nextRace(races, now);
  const outline = next ? outlineFor(next.locality) : null;

  const raceDay = next
    ? new Date(next.raceStart).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const raceTime = next
    ? new Date(next.raceStart).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const nextSession = next?.sessions.find(
    (s) => new Date(s.start).getTime() > now.getTime(),
  );

  const leader = standings[0];
  const second = standings[1];
  const topTeam = constructors[0];
  const topFive = standings.slice(0, 5);

  return (
    <div>
      <PageHeader title="Overview" sub={`${round} of 22 rounds complete`} />
      <div className="flex flex-col gap-5">
        {/* Hero: next race */}
        {next && (
          <div
            className="flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] backdrop-blur-[24px] lg:flex-row"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015) 55%), rgba(10,10,13,0.6)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex flex-1 flex-col gap-1.5 px-6 py-6 lg:px-[38px] lg:py-[34px]">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold tracking-[0.2em] text-[#FF4B42]">
                  NEXT RACE
                </span>
                <span className="h-1 w-1 rounded-full bg-[#F5F3F1]/30" />
                <span className="text-[11px] tracking-[0.2em] text-[#F5F3F1]/50">
                  ROUND {next.round} OF {races.length}
                </span>
              </div>
              <div className="mt-1.5 text-[30px] font-bold tracking-[-0.01em] lg:text-[42px]">
                {next.name}
              </div>
              <div className="text-[15px] text-[#F5F3F1]/60">
                {next.circuit} · {raceDay} · {raceTime}
              </div>
              <Countdown targetIso={next.raceStart} />
            </div>
            <div className="flex h-[220px] w-full flex-none p-[18px] lg:h-auto lg:w-[360px]">
              <div className="relative flex-1 overflow-hidden rounded-2xl bg-white/[0.02] p-4">
                {outline ? (
                  <TrackMap points={outline} />
                ) : (
                  <div className="flex h-full flex-col justify-center gap-2 px-4">
                    <div className="text-[11px] tracking-[0.18em] text-[#F5F3F1]/45">
                      CIRCUIT
                    </div>
                    <div className="text-lg font-semibold">{next.circuit}</div>
                    <div className="text-[13px] text-[#F5F3F1]/55">
                      {next.locality}, {next.country}
                    </div>
                    <div className="mt-2 text-xs text-[#F5F3F1]/40">
                      Track map appears after the first session is run here.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weekend schedule */}
        {next && (
          <ScheduleStrip sessions={next.sessions} now={now.getTime()} />
        )}

        {/* Second row */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
          {/* Telemetry preview */}
          <Link
            href="/telemetry"
            className="flex flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px] hover:border-[#E10600]/35"
          >
            <CardLabel>TELEMETRY</CardLabel>
            <div className="flex flex-1 flex-col justify-center gap-2 py-3.5">
              <div className="text-[19px] font-semibold text-[#F5F3F1]/75">
                Replay a real session
              </div>
              <div className="text-[13.5px] leading-normal text-[#F5F3F1]/50">
                {nextSession
                  ? `Next live session: ${nextSession.label}, ${next?.locality} · ${new Date(
                      nextSession.start,
                    ).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}`
                  : "Speed, gear and gaps from any past session, replayed as it happened."}
              </div>
            </div>
            <div className="text-[12.5px] font-semibold tracking-[0.06em] text-[#FF564E]">
              Open telemetry →
            </div>
          </Link>

          {/* Last race */}
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
            <div className="flex items-center">
              <CardLabel>LAST RACE</CardLabel>
              <div className="flex-1" />
              <Link
                href="/calendar"
                className="text-xs text-[#F5F3F1]/45 hover:text-[#FF564E]"
              >
                All results →
              </Link>
            </div>
            <div className="mt-3.5 text-lg font-semibold">{lastRace.name}</div>
            <div className="mt-0.5 text-[12.5px] text-[#F5F3F1]/50">
              {lastRace.circuit} ·{" "}
              {new Date(lastRace.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
              })}
            </div>
            <div className="mt-4 flex flex-col gap-[9px]">
              {lastRace.podium.map((p) => (
                <div key={p.pos} className="flex items-center gap-3">
                  <div className="w-[22px] text-[13px] font-bold text-[#F5F3F1]/45">
                    {p.pos}
                  </div>
                  <div
                    className="h-4 w-[3px] rounded-full"
                    style={{
                      background: TEAM_COLORS[p.constructorId] ?? "#B6BABD",
                    }}
                  />
                  <div className="text-[14.5px] font-medium">
                    {p.familyName}
                  </div>
                  <div className="flex-1" />
                  <div className="text-[12.5px] text-[#F5F3F1]/50">
                    {p.time}
                  </div>
                </div>
              ))}
            </div>
            {quali && quali.results.length > 0 && (
              <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-[#F5F3F1]/45">
                Pole: {quali.results[0].familyName} · {quali.results[0].time}
              </div>
            )}
          </div>

          {/* Championship snapshot */}
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
            <div className="flex items-center">
              <CardLabel>CHAMPIONSHIP</CardLabel>
              <div className="flex-1" />
              <Link
                href="/standings"
                className="text-xs text-[#F5F3F1]/45 hover:text-[#FF564E]"
              >
                Full table →
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-[9px]">
              {topFive.map((d) => (
                <div key={d.pos} className="flex items-center gap-3">
                  <div className="w-[22px] text-[13px] font-bold text-[#F5F3F1]/45">
                    {d.pos}
                  </div>
                  <Headshot
                    src={headshots[nameKey(d.familyName)] ?? ""}
                    name={d.familyName}
                    color={TEAM_COLORS[d.constructorId] ?? "#B6BABD"}
                    size={24}
                  />
                  <div className="text-[14.5px] font-medium">
                    {d.familyName}
                  </div>
                  <div className="flex-1" />
                  <div className="text-[13.5px] font-semibold">{d.points}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/[0.06] pt-3.5 text-xs text-[#F5F3F1]/45">
              {leader.familyName} leads {second.familyName} by{" "}
              {leader.points - second.points} pts · {topTeam.name} lead
              constructors on {topTeam.points}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
