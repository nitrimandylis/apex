import PageHeader from "@/components/page-header";
import DriverRow from "@/components/driver-row";
import PointsChart from "@/components/points-chart";
import { buildProgression } from "@/lib/progression";
import { getHeadshots } from "@/lib/openf1";
import {
  getConstructorStandings,
  getDriverStandings,
  getSeasonPoints,
} from "@/lib/jolpica";
import { nameKey, pointsGap } from "@/lib/format";
import { TEAM_COLORS } from "@/lib/colors";

export default async function StandingsPage() {
  const [{ round, standings }, constructors] = await Promise.all([
    getDriverStandings(),
    getConstructorStandings(),
  ]);
  const seasonPoints = await getSeasonPoints().catch(() => []);
  const headshots = await getHeadshots();
  const progression =
    seasonPoints.length > 0 ? buildProgression(seasonPoints, 5) : null;
  const leaderPts = standings[0].points;
  const topTeamPts = constructors[0].points;

  return (
    <div>
      <PageHeader
        title="Championship standings"
        sub={`${round} of 22 rounds complete`}
      />
      {progression && (
        <div className="mb-5 rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
          <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            TITLE FIGHT · POINTS BY ROUND
          </div>
          <PointsChart rounds={progression.rounds} lines={progression.lines} />
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
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
                headshot={headshots[nameKey(d.familyName)] ?? ""}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[20px] lg:sticky lg:top-6 border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
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
