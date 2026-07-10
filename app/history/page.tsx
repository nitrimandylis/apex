import PageHeader from "@/components/page-header";
import FavRow from "@/components/fav-row";
import { getDriverStandings, getSeasonWinners } from "@/lib/jolpica";
import { TEAM_COLORS } from "@/lib/colors";
import { nameKey } from "@/lib/format";
import history from "@/lib/history.json";

// The archive (lib/history.json) covers 1950 through last season — it's a
// committed artifact from scripts/build-history.ts. The current season is
// merged in at runtime.

function Card({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-6 py-[22px] backdrop-blur-[18px] lg:px-7 ${
        wide ? "lg:col-span-3" : ""
      }`}
    >
      <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
        {title}
      </div>
      {children}
    </div>
  );
}

function CountRow({
  name,
  familyName,
  count,
  max,
  color,
  detail,
}: {
  name: string;
  familyName: string;
  count: number;
  max: number;
  color: string;
  detail?: string;
}) {
  return (
    <FavRow familyName={familyName} className="-mx-2 rounded-lg px-2 py-1">
      <div className="flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-full" style={{ background: color }} />
        <div className="min-w-0 truncate text-[14px] font-medium">{name}</div>
        {detail && (
          <div className="hidden text-[11.5px] text-[#F5F3F1]/40 sm:block">
            {detail}
          </div>
        )}
        <div className="flex-1" />
        <div className="text-[14px] font-bold">{count}</div>
      </div>
      <div className="mt-1.5 ml-[15px] h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ background: color, width: `${Math.round((count / max) * 100)}%` }}
        />
      </div>
    </FavRow>
  );
}

export default async function HistoryPage() {
  const [{ round, standings }, seasonWinners] = await Promise.all([
    getDriverStandings(),
    getSeasonWinners().catch(() => ({})),
  ]);

  // ---- this season ----
  const currentWinners = standings.filter((d) => d.wins > 0);
  const maxCurrentWins = currentWinners[0]?.wins ?? 1;

  // ---- most titles, drivers and teams (from the archive) ----
  const titleCount = new Map<string, { name: string; familyName: string; constructorId: string; count: number }>();
  for (const c of history.champions) {
    const acc = titleCount.get(c.name) ?? {
      name: c.name,
      familyName: c.familyName,
      constructorId: c.constructorId,
      count: 0,
    };
    acc.count++;
    titleCount.set(c.name, acc);
  }
  const mostTitles = [...titleCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const teamTitleCount = new Map<string, { name: string; constructorId: string; count: number }>();
  for (const c of history.constructorsChampions) {
    const acc = teamTitleCount.get(c.name) ?? {
      name: c.name,
      constructorId: c.constructorId,
      count: 0,
    };
    acc.count++;
    teamTitleCount.set(c.name, acc);
  }
  const mostTeamTitles = [...teamTitleCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ---- all-time wins, archive + this season merged ----
  const allTime = history.winsByDriver.map((w) => ({ ...w }));
  for (const winner of Object.values(seasonWinners)) {
    const hit = allTime.find(
      (w) => nameKey(w.familyName) === nameKey(winner.familyName),
    );
    if (hit) {
      hit.wins++;
      hit.constructorId = winner.constructorId;
    } else {
      allTime.push({
        driverId: nameKey(winner.familyName),
        name: winner.familyName,
        familyName: winner.familyName,
        constructorId: winner.constructorId,
        wins: 1,
      });
    }
  }
  allTime.sort((a, b) => b.wins - a.wins);
  const topWins = allTime.slice(0, 12);
  const maxWins = topWins[0]?.wins ?? 1;

  // ---- full champions roll, three columns reading down ----
  const champs = history.champions; // newest first
  const colSize = Math.ceil(champs.length / 3);
  const champColumns = [
    champs.slice(0, colSize),
    champs.slice(colSize, colSize * 2),
    champs.slice(colSize * 2),
  ];

  const teamsRoll = history.constructorsChampions;
  const teamColSize = Math.ceil(teamsRoll.length / 3);
  const teamColumns = [
    teamsRoll.slice(0, teamColSize),
    teamsRoll.slice(teamColSize, teamColSize * 2),
    teamsRoll.slice(teamColSize * 2),
  ];

  return (
    <div>
      <PageHeader title="History" sub={`archive to ${history.through} · season to round ${round}`} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="2026 · WINS SO FAR">
          <div className="flex flex-col gap-2.5">
            {currentWinners.map((d) => (
              <CountRow
                key={d.familyName}
                name={d.name}
                familyName={d.familyName}
                count={d.wins}
                max={maxCurrentWins}
                color={TEAM_COLORS[d.constructorId] ?? "#B6BABD"}
              />
            ))}
          </div>
        </Card>

        <Card title="MOST WORLD TITLES · 1950–2025">
          <div className="flex flex-col gap-2.5">
            {mostTitles.map((t) => (
              <CountRow
                key={t.name}
                name={t.name}
                familyName={t.familyName}
                count={t.count}
                max={mostTitles[0].count}
                color={TEAM_COLORS[t.constructorId] ?? "#B6BABD"}
              />
            ))}
          </div>
        </Card>

        <Card title="MOST CONSTRUCTORS' TITLES">
          <div className="flex flex-col gap-2.5">
            {mostTeamTitles.map((t) => (
              <CountRow
                key={t.name}
                name={t.name}
                familyName=""
                count={t.count}
                max={mostTeamTitles[0].count}
                color={TEAM_COLORS[t.constructorId] ?? "#B6BABD"}
              />
            ))}
          </div>
        </Card>

        <Card title={`ALL-TIME RACE WINS · 1950 TO TODAY`} wide>
          <div className="grid grid-cols-1 gap-x-10 gap-y-2.5 lg:grid-cols-2">
            {[topWins.slice(0, 6), topWins.slice(6)].map((half, col) => (
              <div key={col} className="flex flex-col gap-2.5">
                {half.map((w, i) => (
                  <CountRow
                    key={w.driverId}
                    name={`${col * 6 + i + 1}. ${w.name}`}
                    familyName={w.familyName}
                    count={w.wins}
                    max={maxWins}
                    color={TEAM_COLORS[w.constructorId] ?? "#B6BABD"}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card title="WORLD CHAMPIONS · EVERY SEASON SINCE 1950" wide>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {champColumns.map((column, col) => (
              <div key={col} className="flex flex-col">
                {column.map((c) => (
                  <FavRow
                    key={c.year}
                    familyName={c.familyName}
                    className="flex items-center gap-3 rounded-lg px-2 py-[5px] hover:bg-white/[0.04]"
                  >
                    <div className="w-10 text-[12.5px] font-bold text-[#F5F3F1]/40">
                      {c.year}
                    </div>
                    <div
                      className="h-3.5 w-[3px] rounded-full"
                      style={{
                        background: TEAM_COLORS[c.constructorId] ?? "#B6BABD",
                      }}
                    />
                    <div className="min-w-0 truncate text-[13.5px] font-medium">
                      {c.familyName}
                    </div>
                    <div className="flex-1" />
                    <div className="hidden truncate text-[11.5px] text-[#F5F3F1]/40 sm:block">
                      {c.team}
                    </div>
                  </FavRow>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card title="CONSTRUCTORS' CHAMPIONS · SINCE 1958" wide>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {teamColumns.map((column, col) => (
              <div key={col} className="flex flex-col">
                {column.map((c) => (
                  <div
                    key={c.year}
                    className="flex items-center gap-3 rounded-lg px-2 py-[5px] hover:bg-white/[0.04]"
                  >
                    <div className="w-10 text-[12.5px] font-bold text-[#F5F3F1]/40">
                      {c.year}
                    </div>
                    <div
                      className="h-3.5 w-[3px] rounded-full"
                      style={{
                        background: TEAM_COLORS[c.constructorId] ?? "#B6BABD",
                      }}
                    />
                    <div className="min-w-0 truncate text-[13.5px] font-medium">
                      {c.name}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
