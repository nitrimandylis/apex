import PageHeader from "@/components/page-header";
import TrackMap from "@/components/track-map";
import Headshot from "@/components/headshot";
import { getCalendar, getSeasonWinners } from "@/lib/jolpica";
import { getHeadshots } from "@/lib/openf1";
import { nameKey, nextRace } from "@/lib/format";
import { TEAM_COLORS } from "@/lib/colors";
import { flagFor } from "@/lib/flags";
import { outlineFor } from "@/lib/outlines";

function dateRange(race: { sessions: { start: string }[]; date: string }) {
  // Weekend span like "17–19 Jul" from first session to race day.
  const first = new Date(race.sessions[0]?.start ?? race.date);
  const last = new Date(race.date);
  const month = last.toLocaleDateString("en-GB", { month: "short" });
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${month}`;
  }
  const firstMonth = first.toLocaleDateString("en-GB", { month: "short" });
  return `${first.getDate()} ${firstMonth}–${last.getDate()} ${month}`;
}

export default async function CalendarPage() {
  const [races, winners] = await Promise.all([
    getCalendar(),
    getSeasonWinners(),
  ]);
  const headshots = await getHeadshots();
  const now = new Date();
  const next = nextRace(races, now);

  return (
    <div>
      <PageHeader title="Race calendar" sub={`${races.length} rounds`} />
      <div className="flex flex-col gap-2.5">
        {races.map((race) => {
          const winner = winners[race.round];
          const outline = outlineFor(race.locality);
          const isSprint = race.sessions.some((s) => s.label === "SPRINT");
          const isNext = race.round === next?.round;
          const isDone = !isNext && new Date(race.raceStart) < now && !!winner;

          let tag = "UPCOMING";
          let tagDot = "rgba(245,243,241,0.2)";
          let tagColor = "rgba(245,243,241,0.4)";
          if (isDone) {
            tag = `WINNER · ${winner.familyName.toUpperCase()}`;
            tagDot = TEAM_COLORS[winner.constructorId] ?? "#B6BABD";
            tagColor = "rgba(245,243,241,0.75)";
          } else if (isNext) {
            const day = new Date(race.raceStart)
              .toLocaleDateString("en-GB", { weekday: "short" })
              .toUpperCase();
            const time = new Date(race.raceStart).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            tag = `NEXT · LIGHTS OUT ${day} ${time}`;
            tagDot = "#E10600";
            tagColor = "#FF564E";
          }

          return (
            <div
              key={race.round}
              className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 lg:grid-cols-[56px_64px_1.3fr_1fr_230px] lg:gap-[18px] lg:px-[22px] lg:py-[15px]"
              style={{
                background: isNext
                  ? "rgba(225,6,0,0.07)"
                  : "rgba(255,255,255,0.025)",
                borderColor: isNext
                  ? "rgba(225,6,0,0.4)"
                  : "rgba(255,255,255,0.06)",
                opacity: isDone ? 0.68 : 1,
              }}
            >
              <div className="text-[13px] font-bold tracking-[0.08em] text-[#F5F3F1]/45">
                R{String(race.round).padStart(2, "0")}
              </div>
              <div className="hidden h-10 lg:block">
                {outline && <TrackMap points={outline} mini />}
              </div>
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span>{flagFor(race.country)}</span>
                  <span>{race.name}</span>
                  {isSprint && (
                    <span className="rounded-md border border-[#FFD12E]/40 bg-[#FFD12E]/10 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.14em] text-[#FFD12E]/90">
                      SPRINT
                    </span>
                  )}
                  {!outline && (
                    <span className="rounded-md border border-[#FF564E]/40 bg-[#E10600]/10 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.14em] text-[#FF564E]/90">
                      NEW CIRCUIT
                    </span>
                  )}
                </div>
                <div className="mt-px text-[12.5px] text-[#F5F3F1]/50">
                  {race.circuit}
                  <span className="lg:hidden"> · {dateRange(race)}</span>
                </div>
              </div>
              <div className="hidden text-[13.5px] text-[#F5F3F1]/65 lg:block">
                {dateRange(race)}
              </div>
              <div className="flex items-center justify-end gap-[9px]">
                {isDone && winner && (
                  <Headshot
                    src={headshots[nameKey(winner.familyName)] ?? ""}
                    name={winner.familyName}
                    color={TEAM_COLORS[winner.constructorId] ?? "#B6BABD"}
                    size={20}
                  />
                )}
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: tagDot }}
                />
                <span
                  className="text-xs font-semibold tracking-[0.1em]"
                  style={{ color: tagColor }}
                >
                  {tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
