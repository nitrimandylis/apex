import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import { getCalendar, getDriverStandings } from "@/lib/jolpica";
import { nextRace, shortRaceLine } from "@/lib/format";
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
        <div
          className="flex min-h-screen flex-col lg:flex-row"
          style={{
            background:
              "radial-gradient(1100px 520px at 82% -8%, rgba(225,6,0,0.09), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(255,255,255,0.03), transparent 55%), #060608",
          }}
        >
          <FavoriteProvider>
            <Sidebar
              nextRace={
                next
                  ? {
                      round: next.round,
                      name: next.name.replace(" Grand Prix", " GP"),
                      detail: shortRaceLine(next),
                    }
                  : undefined
              }
              drivers={standings.map((d) => d.familyName)}
            />
            <div className="flex-1 lg:h-screen lg:overflow-y-auto">
              <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-[60px] lg:px-12 lg:pt-[38px]">
                {children}
              </div>
            </div>
          </FavoriteProvider>
        </div>
      </body>
    </html>
  );
}
