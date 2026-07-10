# APEX — F1 Dashboard

Formula 1 dashboard for the 2026 season. All data is live from public APIs — nothing hardcoded. See `PRODUCT.md` for scope and decisions.

## Commands

- `bun run dev` — dev server (Turbopack)
- `bun run build` — production build; run before claiming anything works
- `bun run lint` — ESLint
- `bun test` — runs the `lib/*.test.ts` checks

Bun for everything (install, run, test). No env vars, no API keys.

## Next.js 16 warning

This uses Next 16 — newer than most training data. Check `node_modules/next/dist/docs/` before using caching or routing APIs from memory. `cacheComponents` is NOT enabled; the classic model applies: `fetch(url, { next: { revalidate: N } })`.

## Architecture

Two data sources, one rule: **Jolpica = championship layer, OpenF1 = car layer.**

- `lib/jolpica.ts` — standings, calendar, results, champions. Server-only, ISR-cached (1h; champions 1 week). Jolpica has no telemetry.
- `lib/openf1.ts` — telemetry replay fetchers (client) + track outline (server, cached 1 week). OpenF1 has no points/standings and no data before 2023.
- `lib/replay.ts` — pure replay math (binary search, running order, lap/tyre lookups). Tested. Keep it free of fetching and React.
- `components/replay.tsx` — the replay state machine (idle → loading → playing; 250 ms clock tick).
- `app/*/page.tsx` — one route per view (Overview `/`, Calendar, Standings, Telemetry, History). Server components except telemetry.
- `lib/colors.ts` — team colors keyed by Jolpica constructorId; `colorForTeamName()` bridges OpenF1 team names.

## API gotchas (learned the hard way)

- Both APIs 429 on bursts. All clients retry with a wait; champions fetch sequentially. Never add parallel fan-out against Jolpica.
- OpenF1 returns **404 for an empty result window** (e.g. intervals with no data) — treat as empty, not an error.
- OpenF1 `car_data` can contain stray samples from the day before a session — always bound requests with `date>` / `date<` to the session window.
- OpenF1 `intervals` exists for races only; practice/quali running order shows no gaps by design.
- Country names differ between APIs ("UK" vs "Great Britain") — see `COUNTRY_ALIASES` in `lib/openf1.ts`.

## Conventions

- Design source of truth is `design/prototype.html` (unpacked from the original `F1 Dashboard.html` artifact). Static styles → Tailwind classes; dynamic values (team colors, bar widths) → `style={{}}`.
- Plain, explicit code — no clever one-liners or heavy abstractions.
- Testing: one smallest runnable check per non-trivial pure module (`bun test`). No suites.
- Commits: short imperative, straight to main, no Co-Authored-By footer. Push only when asked.
- Deploys happen by pushing to GitHub (Vercel auto-deploy). Never `vercel deploy`.
