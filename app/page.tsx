import Link from "next/link";
import { connection } from "next/server";
import Logo from "@/components/logo";
import GitHubMark from "@/components/github-mark";
import { getCalendar, getDriverStandings } from "@/lib/jolpica";
import { nextRace } from "@/lib/format";
import { outlineFor } from "@/lib/outlines";
import history from "@/lib/history.json";
import outlines from "@/lib/track-outlines.json";

const GITHUB = "https://github.com/nitrimandylis/apex";

// The landing poster. Manifesto voice: assertions, then the door.
export default async function LandingPage() {
  await connection(); // the live line names the next race, see the dashboard layout
  // Honest live line — hidden entirely if the APIs are unreachable.
  let liveLine: string | null = null;
  let roundCount = "—";
  try {
    const [{ round, standings }, races] = await Promise.all([
      getDriverStandings(),
      getCalendar(),
    ]);
    const leader = standings[0];
    roundCount = String(races.length);
    const next = nextRace(races, new Date());
    liveLine =
      `P1 ${leader.familyName.toUpperCase()} · ${leader.points} PTS` +
      ` · AFTER ROUND ${round}` +
      (next ? ` · NEXT ${next.name.toUpperCase()}` : "");
  } catch {
    liveLine = null;
  }

  const spa = outlineFor("Spa");
  const circuitCount = Object.keys(outlines).length;
  const seasonCount = history.champions.length;

  const claims: { big: string; small: string; accent?: boolean }[] = [
    {
      big: "The telemetry is replayed, not simulated.",
      small:
        "Every speed trace, gear shift, safety car and radio call on this dashboard happened on track. Pick a session, pick a car, watch it again.",
    },
    {
      big: "The track maps are position-data truth.",
      small: `${circuitCount} circuits drawn from one real lap of car coordinates each. Nobody traced a picture.`,
      accent: true,
    },
    {
      big: `${seasonCount} seasons deep.`,
      small:
        "Every world champion since 1950. Every constructors' title since 1958. Every race winner, counted.",
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-clip"
      style={{ background: "var(--paper-field)", color: "var(--color-ink)" }}
    >
      {/* Same sticky glass bar the dashboard uses for its mobile top bar */}
      <nav className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#060608]/90 backdrop-blur-[20px]">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-5 py-4 sm:gap-4 lg:px-12">
          <Logo size={24} />
          <span className="text-base font-bold tracking-[0.16em]">APEX</span>
          <div className="flex-1" />
          <a
            href={GITHUB}
            className="flex items-center gap-1.5 text-body font-medium text-[#F5F3F1]/58 hover:text-[#F5F3F1]"
          >
            <GitHubMark size={15} />
            Source
          </a>
          <Link
            href="/overview"
            className="rounded-full bg-[#E10600] px-6 py-2.5 text-body font-semibold tracking-[0.04em] hover:brightness-110"
          >
            Enter
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-[1280px] px-5 lg:px-12">
        {/* Hero */}
        <header className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-24">
          {spa && (
            <svg
              viewBox="0 0 100 100"
              className="pointer-events-none absolute -right-10 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 lg:block"
              style={{ opacity: 0.14 }}
              aria-hidden
            >
              <polyline
                points={(() => {
                  const xs = spa.map((p) => p.x);
                  const ys = spa.map((p) => p.y);
                  const minX = Math.min(...xs);
                  const minY = Math.min(...ys);
                  const scale =
                    84 /
                    Math.max(
                      Math.max(...xs) - minX,
                      Math.max(...ys) - minY,
                    );
                  return spa
                    .map(
                      (p) =>
                        `${(8 + (p.x - minX) * scale).toFixed(1)},${(
                          100 -
                          (8 + (p.y - minY) * scale)
                        ).toFixed(1)}`,
                    )
                    .join(" ");
                })()}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          )}

          <h1 className="relative max-w-[900px] text-[9vw] leading-[1.02] font-bold tracking-[-0.02em] lg:text-hero">
            <span className="sweep-in block">Every race.</span>
            <span className="sweep-in delay-1 block">
              <span className="rounded-[14px] bg-[#E10600]/90 px-3">
                Every number.
              </span>
            </span>
            <span className="sweep-in delay-2 block">Every year.</span>
          </h1>
          <p className="relative mt-8 max-w-[520px] text-title leading-snug font-medium text-[#F5F3F1]/60 lg:text-head">
            APEX is an open-source Formula 1 dashboard. Nothing on it is
            hardcoded, mocked, or made up.
          </p>
        </header>

        {/* Claims */}
        <section className="grid gap-4 pb-4">
          {claims.map((c) => (
            <div
              key={c.big}
              className={`rounded-[22px] border px-7 py-8 backdrop-blur-[18px] lg:px-10 lg:py-10 ${
                c.accent
                  ? "border-[#E10600]/35 bg-[#E10600]/[0.08]"
                  : "border-white/[0.08] bg-white/[0.03]"
              }`}
            >
              <h2 className="max-w-[900px] text-subhead leading-tight font-semibold tracking-[-0.01em] lg:text-display-sm">
                {c.big}
              </h2>
              <p className="mt-3 max-w-[560px] text-lede leading-normal text-[#F5F3F1]/55 lg:text-title">
                {c.small}
              </p>
            </div>
          ))}
        </section>

        {/* The numbers — all real */}
        <section className="grid grid-cols-2 gap-4 pb-4 lg:grid-cols-4">
          {[
            [roundCount, "rounds this season"],
            [String(circuitCount), "circuits drawn from telemetry"],
            [String(seasonCount), "seasons in the archive"],
            ["0", "API keys required"],
          ].map(([n, label]) => (
            <div
              key={label}
              className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-[26px] backdrop-blur-[18px]"
            >
              <div className="text-display-sm leading-none font-bold tracking-[-0.01em]">
                {n}
              </div>
              <div className="mt-2 text-label font-bold tracking-[0.2em] text-[#F5F3F1]/45 uppercase">
                {label}
              </div>
            </div>
          ))}
        </section>

        {/* Live strip — real, or absent */}
        {liveLine && (
          <div className="mb-4 overflow-x-auto rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-7 py-4 text-body font-bold tracking-[0.16em] whitespace-nowrap text-[#FF564E] backdrop-blur-[18px]">
            LIVE STANDINGS · {liveLine}
          </div>
        )}

        {/* The door */}
        <section className="pt-12 pb-24 lg:pt-16 lg:pb-32">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Link
              href="/overview"
              className="group flex items-center justify-between gap-4 rounded-[22px] bg-[#E10600] px-8 py-9 transition-[filter] duration-200 hover:brightness-110 lg:px-10"
              style={{ color: "var(--color-ink)" }}
            >
              <span className="text-subhead leading-none font-semibold tracking-[-0.01em] whitespace-nowrap lg:text-display-sm">
                Enter the dashboard
              </span>
              <span className="text-subhead leading-none font-semibold transition-transform duration-200 group-hover:translate-x-2 lg:text-display-sm">
                →
              </span>
            </Link>
            <a
              href={GITHUB}
              className="gh-block flex items-center justify-center gap-3 rounded-[22px] px-8 py-9 text-head font-semibold transition-colors duration-200 lg:text-subhead"
            >
              <GitHubMark size={26} />
              Source
            </a>
          </div>
          <p className="mt-5 text-body text-[#F5F3F1]/45">
            github.com/nitrimandylis/apex · MIT
          </p>
        </section>
      </div>

      {/* Statement footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1280px] px-5 pt-14 pb-10 lg:px-12">
          <p className="max-w-[820px] text-subhead leading-tight font-semibold tracking-[-0.01em] lg:text-display-sm">
            Unofficial. Unaffiliated. Just the data.
          </p>
          <p className="mt-5 max-w-[640px] text-body leading-relaxed text-[#F5F3F1]/45">
            APEX is a fan project and is not associated with Formula 1, the FIA,
            or any team. Championship data via Jolpica, telemetry via OpenF1.
            Driver imagery and team radio are linked from public sources, never
            bundled.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-caption font-medium tracking-[0.04em] text-[#F5F3F1]/58">
            <a href={GITHUB} className="flex items-center gap-1.5 hover:text-[#F5F3F1]">
              <GitHubMark size={14} />
              GitHub
            </a>
            <Link href="/overview" className="hover:text-[#F5F3F1]">
              Dashboard
            </Link>
            <span className="text-[#F5F3F1]/35">MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
