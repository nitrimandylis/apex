import Link from "next/link";
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
  // Honest live line — hidden entirely if the APIs are unreachable.
  let liveLine: string | null = null;
  try {
    const [{ round, standings }, races] = await Promise.all([
      getDriverStandings(),
      getCalendar(),
    ]);
    const leader = standings[0];
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
      style={{
        background: "var(--color-paper)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Slab nav — two destinations, that's the whole point */}
      <nav
        className="flex items-center gap-3 px-4 py-5 sm:gap-4 sm:px-6 lg:px-12"
        style={{ borderBottom: "3px solid var(--color-accent)" }}
      >
        <Logo size={24} />
        <span className="text-lg font-bold tracking-[0.18em]">APEX</span>
        <div className="flex-1" />
        <a
          href={GITHUB}
          className="flex items-center gap-1.5 text-[13px] font-bold tracking-[0.12em] hover:text-[--color-accent-bright]"
          style={{ color: "var(--color-ink-dim)" }}
        >
          <GitHubMark size={15} />
          GITHUB ↗
        </a>
        <Link
          href="/overview"
          className="px-4 py-2 text-[13px] font-bold tracking-[0.12em]"
          style={{ background: "var(--color-accent)", color: "var(--color-ink)" }}
        >
          ENTER →
        </Link>
      </nav>

      {/* Manifesto hero */}
      <header className="relative overflow-hidden px-6 pt-20 pb-24 lg:px-12 lg:pt-28 lg:pb-32">
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

        <div className="relative" style={{ transform: "rotate(-2deg)" }}>
          <h1
            className="text-[11vw] leading-[0.92] font-extrabold tracking-[-0.02em] uppercase lg:text-[110px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="sweep-in block">Every race.</span>
            <span className="sweep-in delay-1 block">
              <span
                className="px-3"
                style={{ background: "var(--color-accent)" }}
              >
                Every number.
              </span>
            </span>
            <span className="sweep-in delay-2 block">Every year.</span>
          </h1>
        </div>
        <p
          className="mt-10 max-w-[520px] text-[19px] leading-snug font-medium lg:text-[22px]"
          style={{ color: "var(--color-ink-dim)" }}
        >
          APEX is an open-source Formula 1 dashboard. Nothing on it is
          hardcoded, mocked, or made up.
        </p>
      </header>

      {/* Claims — bleed blocks, no hairlines */}
      {claims.map((c) => (
        <section
          key={c.big}
          className="px-6 py-16 lg:px-12 lg:py-20"
          style={
            c.accent
              ? { background: "var(--color-accent)" }
              : { background: "var(--color-paper)" }
          }
        >
          <h2
            className="max-w-[900px] text-[34px] leading-[1.05] font-extrabold lg:text-[54px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {c.big}
          </h2>
          <p
            className="mt-4 max-w-[560px] text-[16px] leading-normal lg:text-[18px]"
            style={{
              color: c.accent
                ? "oklch(96.5% 0.003 90 / 0.85)"
                : "var(--color-ink-dim)",
            }}
          >
            {c.small}
          </p>
        </section>
      ))}

      {/* The numbers — all real */}
      <section
        className="grid grid-cols-2 gap-px lg:grid-cols-4"
        style={{ background: "var(--color-rule)" }}
      >
        {[
          ["22", "rounds this season"],
          [String(circuitCount), "circuits drawn from telemetry"],
          [String(seasonCount), "seasons in the archive"],
          ["0", "API keys required"],
        ].map(([n, label]) => (
          <div
            key={label}
            className="px-6 py-10 lg:px-12"
            style={{ background: "var(--color-paper)" }}
          >
            <div
              className="text-[56px] leading-none font-extrabold lg:text-[72px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {n}
            </div>
            <div
              className="mt-2 text-[13px] tracking-[0.08em] uppercase"
              style={{ color: "var(--color-ink-faint)" }}
            >
              {label}
            </div>
          </div>
        ))}
      </section>

      {/* Live strip — real, or absent */}
      {liveLine && (
        <div
          className="overflow-x-auto px-6 py-4 text-[13px] font-bold tracking-[0.16em] whitespace-nowrap lg:px-12"
          style={{
            borderTop: "3px solid var(--color-accent)",
            borderBottom: "3px solid var(--color-accent)",
            color: "var(--color-accent-bright)",
          }}
        >
          LIVE STANDINGS · {liveLine}
        </div>
      )}

      {/* The door */}
      <section className="px-6 py-24 lg:px-12 lg:py-32">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Link
            href="/overview"
            className="group flex items-center justify-between gap-4 px-6 py-9 transition-[filter] duration-200 hover:brightness-110 lg:px-10"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            <span className="text-[6vw] leading-none font-extrabold tracking-[-0.01em] uppercase whitespace-nowrap lg:text-[52px]">
              Enter the dashboard
            </span>
            <span className="text-[6vw] leading-none font-extrabold transition-transform duration-200 group-hover:translate-x-2 lg:text-[52px]">
              →
            </span>
          </Link>
          <a
            href={GITHUB}
            className="gh-block flex items-center justify-center gap-3 px-6 py-9 text-[22px] font-extrabold tracking-[0.04em] uppercase transition-colors duration-200 lg:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <GitHubMark size={26} />
            Source
          </a>
        </div>
        <p
          className="mt-5 text-[13px]"
          style={{ color: "var(--color-ink-faint)" }}
        >
          github.com/nitrimandylis/apex · MIT
        </p>
      </section>

      {/* Statement footer */}
      <footer className="px-6 pt-16 pb-10 lg:px-12">
        <p
          className="max-w-[820px] text-[26px] leading-tight font-extrabold lg:text-[38px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Unofficial. Unaffiliated. Just the data.
        </p>
        <p
          className="mt-5 max-w-[640px] text-[13px] leading-relaxed"
          style={{ color: "var(--color-ink-faint)" }}
        >
          APEX is a fan project and is not associated with Formula 1, the FIA,
          or any team. Championship data via Jolpica, telemetry via OpenF1.
          Driver imagery and team radio are linked from public sources, never
          bundled.
        </p>
        <div
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-bold tracking-[0.14em]"
          style={{ color: "var(--color-ink-dim)" }}
        >
          <a
            href={GITHUB}
            className="flex items-center gap-1.5 hover:text-[--color-accent-bright]"
          >
            <GitHubMark size={14} />
            GITHUB
          </a>
          <Link href="/overview" className="hover:text-[--color-accent-bright]">
            DASHBOARD
          </Link>
          <span style={{ color: "var(--color-ink-faint)" }}>MIT LICENSE</span>
        </div>
      </footer>
    </div>
  );
}
