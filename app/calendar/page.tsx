import PageHeader from "@/components/page-header";
import { getCalendar, getSeasonWinners } from "@/lib/jolpica";
import { nextRace } from "@/lib/format";
import { TEAM_COLORS } from "@/lib/colors";

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
  const now = new Date();
  const next = nextRace(races, now);

  return (
    <div>
      <PageHeader title="Race calendar" sub={`${races.length} rounds`} />
      <div className="flex flex-col gap-2.5">
        {races.map((race) => {
          const winner = winners[race.round];
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
              className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 lg:grid-cols-[56px_1.4fr_1fr_220px] lg:gap-[18px] lg:px-[22px] lg:py-[15px]"
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
              <div>
                <div className="text-base font-semibold">{race.name}</div>
                <div className="mt-px text-[12.5px] text-[#F5F3F1]/50">
                  {race.circuit}
                  <span className="lg:hidden"> · {dateRange(race)}</span>
                </div>
              </div>
              <div className="hidden text-[13.5px] text-[#F5F3F1]/65 lg:block">
                {dateRange(race)}
              </div>
              <div className="flex items-center justify-end gap-[9px]">
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
