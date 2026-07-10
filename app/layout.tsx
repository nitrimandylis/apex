import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Shell from "@/components/shell";
import { getCalendar, getDriverStandings } from "@/lib/jolpica";
import { nextRace, shortRaceLine } from "@/lib/format";
import { circuitTz } from "@/lib/timezones";
import { FavoriteProvider } from "@/lib/favorite";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APEX — F1 Dashboard",
  description: "Formula 1 dashboard for the 2026 season",
};

export default async function RootLayout({
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
    <html lang="en" className={outfit.variable}>
      <body>
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
      </body>
    </html>
  );
}
