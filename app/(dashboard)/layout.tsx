import Shell from "@/components/shell";
import { getCalendar, getDriverStandings } from "@/lib/jolpica";
import { nextRace, shortRaceLine } from "@/lib/format";
import { circuitTz } from "@/lib/timezones";
import { FavoriteProvider } from "@/lib/favorite";

// The dashboard frame: nav shell + favorite context. The landing page at /
// lives outside this group and gets neither.
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [races, { standings }] = await Promise.all([
    getCalendar(),
    getDriverStandings(),
  ]);
  const next = nextRace(races, new Date());

  return (
    <FavoriteProvider>
      <Shell
        nextRace={
          next
            ? {
                round: next.round,
                name: next.name.replace(" Grand Prix", " GP"),
                detail: shortRaceLine(next, circuitTz(next.locality)),
              }
            : undefined
        }
        drivers={standings.map((d) => d.familyName)}
      >
        {children}
      </Shell>
    </FavoriteProvider>
  );
}
