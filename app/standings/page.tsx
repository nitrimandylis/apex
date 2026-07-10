import PageHeader from "@/components/page-header";
import DriverRow from "@/components/driver-row";
import { getConstructorStandings, getDriverStandings } from "@/lib/jolpica";
import { pointsGap } from "@/lib/format";
import { TEAM_COLORS } from "@/lib/colors";

export default async function StandingsPage() {
  const [{ round, standings }, constructors] = await Promise.all([
    getDriverStandings(),
    getConstructorStandings(),
  ]);
  const leaderPts = standings[0].points;
  const topTeamPts = constructors[0].points;

  return (
    <div>
      <PageHeader
        title="Championship standings"
        sub={`${round} of 22 rounds complete`}
      />
      <div className="grid grid-cols-[1.25fr_1fr] items-start gap-5">
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
          <div className="mb-[18px] text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            DRIVERS · AFTER ROUND {round}
          </div>
          <div className="flex flex-col gap-1.5">
            {standings.map((d, i) => (
              <DriverRow
                key={d.familyName + d.pos}
                pos={d.pos}
                name={d.name}
                familyName={d.familyName}
                team={d.team}
                color={TEAM_COLORS[d.constructorId] ?? "#B6BABD"}
                gap={pointsGap(leaderPts, d.points)}
                pts={d.points}
                zebra={i % 2 === 0}
              />
            ))}
          </div>
        </div>

        <div className="sticky top-6 rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
          <div className="mb-[18px] text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            CONSTRUCTORS
          </div>
          <div className="flex flex-col gap-3.5">
            {constructors.map((t) => {
              const color = TEAM_COLORS[t.constructorId] ?? "#B6BABD";
              const barWidth = Math.max(
                1,
                Math.round((t.points / topTeamPts) * 100),
              );
              return (
                <div key={t.constructorId}>
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-[13px] font-bold text-[#F5F3F1]/40">
                      {t.pos}
                    </div>
                    <div className="text-[14.5px] font-medium">{t.name}</div>
                    <div className="flex-1" />
                    <div className="text-[14.5px] font-bold">{t.points}</div>
                  </div>
                  <div className="mt-2 ml-9 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ background: color, width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
