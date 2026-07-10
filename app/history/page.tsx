import PageHeader from "@/components/page-header";
import FavRow from "@/components/fav-row";
import { getChampions, getDriverStandings } from "@/lib/jolpica";
import { TEAM_COLORS } from "@/lib/colors";

export default async function HistoryPage() {
  const [{ round, standings }, champions] = await Promise.all([
    getDriverStandings(),
    getChampions(),
  ]);

  const winners = standings.filter((d) => d.wins > 0);
  const maxWins = winners[0]?.wins ?? 1;
  const totalWins = winners.reduce((sum, d) => sum + d.wins, 0);
  const leader = standings[0];

  return (
    <div>
      <PageHeader title="History" sub={`${round} of 22 rounds complete`} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
          <div className="mb-5 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            2026 · WINS SO FAR
          </div>
          <div className="flex flex-col gap-4">
            {winners.map((d) => {
              const color = TEAM_COLORS[d.constructorId] ?? "#B6BABD";
              return (
                <FavRow
                  key={d.familyName}
                  familyName={d.familyName}
                  className="-mx-2 rounded-lg px-2 py-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-[3px] rounded-full"
                      style={{ background: color }}
                    />
                    <div className="text-[14.5px] font-medium">{d.name}</div>
                    <div className="flex-1" />
                    <div className="text-[14.5px] font-bold">{d.wins}</div>
                  </div>
                  <div className="mt-2 ml-[15px] h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: color,
                        width: `${Math.round((d.wins / maxWins) * 100)}%`,
                      }}
                    />
                  </div>
                </FavRow>
              );
            })}
          </div>
          <div className="mt-[22px] border-t border-white/[0.06] pt-4 text-[12.5px] leading-relaxed text-[#F5F3F1]/50">
            {leader.name} leads the season with {leader.wins} of {totalWins}{" "}
            wins so far and {leader.points} points after round {round}.
          </div>
        </div>

        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]">
          <div className="mb-[18px] text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            WORLD CHAMPIONS · LAST 10 YEARS
          </div>
          <div className="flex flex-col gap-[5px]">
            {champions.map((c) => (
              <FavRow
                key={c.year}
                familyName={c.name.split(" ").slice(-1)[0]}
                className="flex items-center gap-3.5 rounded-xl px-3.5 py-2 hover:bg-white/[0.04]"
              >
                <div className="w-11 text-[13px] font-bold text-[#F5F3F1]/40">
                  {c.year}
                </div>
                <div
                  className="h-4 w-[3px] rounded-full"
                  style={{ background: TEAM_COLORS[c.constructorId] ?? "#B6BABD" }}
                />
                <div className="text-[14.5px] font-medium">{c.name}</div>
                <div className="flex-1" />
                <div className="text-[12.5px] text-[#F5F3F1]/45">{c.team}</div>
              </FavRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
