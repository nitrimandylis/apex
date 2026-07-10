# APEX F1 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A five-view F1 dashboard (Overview, Calendar, Standings, Telemetry, History) with real 2026-season data from Jolpica and real telemetry replay from OpenF1, faithfully porting the design in `design/prototype.html`.

**Architecture:** Next.js App Router; each view is a route sharing a sidebar layout. Server components fetch Jolpica with ISR caching (1 h) so visitors never hit the API directly. The Telemetry view is a client component that replays a chosen historical session from OpenF1 by advancing a simulated clock over pre-fetched car data. The circuit map is an SVG polyline built server-side from one lap of OpenF1 position data.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind v4, bun as runtime/package manager, `next/font` for Outfit. No other dependencies.

## Global Constraints

- Package manager/runtime: **bun** (`bun install`, `bun run dev`, `bun test`, `bunx`).
- Code style: plain, explicit, defensible at IB-CS level. No clever one-liners, no generics beyond basics.
- **Design source of truth: `design/prototype.html`** (unpacked from `F1 Dashboard.html`). Faithful 1:1 port. Static styles become Tailwind classes (arbitrary values allowed, e.g. `rounded-[22px]`); dynamic values (team colors, bar widths) stay as `style={{}}` props.
- Font: Outfit (`next/font/google`), weights 300–800. Body: `bg-[#060608] text-[#F5F3F1]`, `font-variant-numeric: tabular-nums`.
- Accent red `#E10600` (bright variants `#FF564E`, `#FF4B42`, gradient `#FF2A1F → #B50500`).
- APIs: Jolpica base `https://api.jolpi.ca/ergast/f1`, OpenF1 base `https://api.openf1.org/v1`. No API keys. Jolpica fetches: `{ next: { revalidate: 3600 } }` (champions/track map: `604800`).
- Testing: **one smallest runnable check per non-trivial pure module** via `bun test` — no suites (user rule, overrides TDD-per-step).
- Commits: per task, short imperative, **no Co-Authored-By footer** (user git convention).
- Name: app is **APEX**; repo `f1-dash`.

## Verified API facts (probed 2026-07-10, don't re-derive)

- Jolpica season=2026, round=9 complete. `constructorId`s: `mercedes, ferrari, mclaren, red_bull, alpine, rb, haas, williams, audi, aston_martin, cadillac`.
- Calendar: 22 races; race objects have `round, raceName, date, time (UTC, e.g. "13:00:00Z"), Circuit.{circuitId, circuitName, Location.{locality, country, lat, long}}`, plus `FirstPractice/SecondPractice/ThirdPractice/Qualifying` each `{date, time}`. Next race: round 10 Belgian GP, race start `2026-07-19T13:00:00Z`.
- Last results: `/current/last/results.json` → `Races[0].Results[n]` with `position, Driver.familyName, Constructor.constructorId, Time.time` (winner absolute, others `+x.xxx`; fall back to `status` when no `Time`).
- Driver standings rows include `wins` (used by History). 2025 champion: Norris/McLaren (endpoint `/{year}/driverstandings/1.json` works).
- OpenF1 `sessions?year=2026` → 126 sessions, fields `session_key, session_name ("Race","Qualifying","Practice 1"…), location, country_name, date_start, date_end, circuit_short_name`. British GP race = `session_key 11326`.
- `drivers?session_key=` → 22 rows: `driver_number, name_acronym, last_name, team_name, team_colour (hex, no #), headshot_url`.
- `car_data?session_key=&driver_number=` → ~4 Hz rows `{date, speed, n_gear, throttle, brake (0/100), rpm}`. Full race ≈ 21k rows — fetch once per driver choice, filter with `date>` / `date<` URL params if needed.
- `intervals` (RACE SESSIONS ONLY): `{date, driver_number, gap_to_leader (number|null), interval}` ~every 4 s per driver. Fetch in time windows.
- `position` (all session types, small): `{date, driver_number, position}` — only rows for changes, 467 rows for the race.
- `stints`: `{driver_number, stint_number, lap_start, lap_end, compound ("SOFT"|"MEDIUM"|"HARD"|"INTERMEDIATE"|"WET")}`.
- `laps?session_key=&driver_number=`: `{lap_number, date_start, lap_duration (seconds, may be null)}`.
- `location?session_key=&driver_number=&date>…&date<…`: `{x, y}` ~3.7 Hz — one lap ≈ 350 points, plenty for a track outline.
- Time filters are URL-encoded comparisons: `date%3E2026-07-05T14:10:00`.

## File Structure

```
app/layout.tsx            root layout: fonts, body theme, <Sidebar/>, <FavoriteProvider/>
app/page.tsx              Overview (server)
app/calendar/page.tsx     Calendar (server)
app/standings/page.tsx    Standings (server)
app/history/page.tsx      History (server)
app/telemetry/page.tsx    Telemetry (thin server wrapper → client component)
components/sidebar.tsx    client (usePathname for active nav) + favorite picker
components/countdown.tsx  client, ticks every second
components/driver-row.tsx client row that highlights when it matches favorite
components/track-map.tsx  server: SVG polyline from points passed as props
components/replay.tsx     client: whole telemetry live view (pickers, transport, gauges, order)
lib/jolpica.ts            typed fetchers for all Jolpica data
lib/openf1.ts             fetch helpers for OpenF1 (used client & server)
lib/replay.ts             PURE replay helpers (indexing, formatting) — bun tested
lib/colors.ts             constructorId/team_name → hex, tyre letter colors
lib/favorite.tsx          FavoriteProvider + useFavorite (localStorage)
lib/format.ts             pure date/gap/countdown helpers — bun tested
```

---

### Task 1: Scaffold + theme + sidebar shell

**Files:** create Next app in repo root (`bunx create-next-app@latest . --ts --tailwind --app --no-src-dir --import-alias "@/*"`), then `app/layout.tsx`, `components/sidebar.tsx`, stub pages for all five routes.

**Interfaces produced:** route skeleton; `<Sidebar/>` with nav items Overview `/`, Calendar `/calendar`, Standings `/standings`, Telemetry `/telemetry`, History `/history`.

- [ ] Scaffold with create-next-app (it will keep existing files; move `F1 Dashboard.html`, `design/`, `docs/`, `PRODUCT.md` aside first if the CLI refuses a non-empty dir, then restore).
- [ ] `app/layout.tsx`: Outfit via `next/font/google` (weights 300–800), body classes + the two radial-gradient background layers from prototype line 134, flex shell: sidebar + scrollable main (`max-w-[1280px] mx-auto px-12 py-9`).
- [ ] `components/sidebar.tsx` (`"use client"`): APEX logo block (prototype lines 138–144: rotated red square + APEX / 2026 SEASON), nav items from `usePathname()` (active = white text, red glowing dot — see `navItems` styling in prototype logic), next-race card placeholder at bottom (wired in Task 2).
- [ ] Stub pages: each route renders its title header row (prototype lines 166–177) with static title text.
- [ ] Verify: `bun run build` passes; `bun run dev` shows themed shell, nav switches routes.
- [ ] Commit `scaffold next app with themed shell and sidebar`.

### Task 2: Data layer — Jolpica + colors + format helpers

**Files:** `lib/jolpica.ts`, `lib/colors.ts`, `lib/format.ts`, `lib/format.test.ts`; wire sidebar next-race card.

**Interfaces produced:**
```ts
// lib/jolpica.ts
export type Race = { round: number; name: string; circuit: string; locality: string; country: string;
  date: string; raceStart: string /* ISO */; sessions: { label: string; start: string }[] };
export type DriverStanding = { pos: number; name: string; familyName: string; team: string;
  constructorId: string; points: number; wins: number };
export type ConstructorStanding = { pos: number; name: string; constructorId: string; points: number };
export type RaceResult = { pos: number; familyName: string; constructorId: string; time: string };
export type Champion = { year: number; name: string; team: string; constructorId: string };
export async function getCalendar(): Promise<Race[]>;
export async function getDriverStandings(): Promise<{ round: number; standings: DriverStanding[] }>;
export async function getConstructorStandings(): Promise<ConstructorStanding[]>;
export async function getLastRace(): Promise<{ name: string; circuit: string; date: string; podium: RaceResult[] }>;
export async function getChampions(): Promise<Champion[]>; // 2016..2025, revalidate 604800

// lib/colors.ts
export const TEAM_COLORS: Record<string, string>; // constructorId → hex (from prototype teamColor())
export function colorForTeamName(openF1TeamName: string): string; // "McLaren" → TEAM_COLORS.mclaren etc, fallback '#B6BABD'
export const TYRE_COLORS: Record<string, string>; // S/M/H red/yellow/white, I '#43B02A', W '#0067AD'

// lib/format.ts
export function nextRace(races: Race[], now: Date): Race | undefined; // first race with raceStart > now
export function countdownParts(targetIso: string, now: Date): { days: string; hours: string; mins: string; secs: string }; // zero-padded, clamped at 0
export function pointsGap(leaderPts: number, pts: number): string; // '—' for leader else '-31'
```
Prototype `teamColor()` map (line 487) is the palette: `mercedes #00D2BE, ferrari #E8002D, mclaren #FF8000, red_bull #3671C6, alpine #0090FF, rb #6692FF, haas #B6BABD, williams #64C4FF, audi #F50537, aston_martin #229971, cadillac #C5A253`.

- [ ] Implement the three lib files; Jolpica fetchers `fetch(url, { next: { revalidate: 3600 } })`, map raw JSON to the types above (raceStart = `date + 'T' + time`).
- [ ] `lib/format.test.ts` (bun test): one test each for `nextRace` (picks round 10 given a fixture of two races around a fixed date), `countdownParts` (known diff → "01"/"02"…), `pointsGap`.
- [ ] Wire sidebar card: layout fetches calendar, passes next race to `<Sidebar nextRace={...}/>` ("NEXT · ROUND 10 / Belgian GP / Spa · 19 Jul, 15:00" — local-time formatted).
- [ ] Verify: `bun test` passes, `bun run build` passes.
- [ ] Commit `add jolpica data layer, colors, format helpers`.

### Task 3: Calendar view

**Files:** `app/calendar/page.tsx`.

**Consumes:** `getCalendar()`, `getLastRaceWinners` — extend: also fetch per-round winners. Add to `lib/jolpica.ts`: `getSeasonWinners(): Promise<Record<number, { familyName: string; constructorId: string }>>` from `/current/results/1.json` (one request; each race's `Results[0]` is the winner).

Port prototype lines 293–311: one row per race, grid `56px 1.4fr 1fr 200px`. Status logic from real dates (`done` = raceStart < now with winner tag "WINNER · LECLERC" + team dot; `next` = first future (red border/bg, tag "NEXT · LIGHTS OUT SUN 15:00" built from raceStart); `up` = rest, tag "UPCOMING"). Done rows opacity 0.68.

- [ ] Implement `getSeasonWinners` + page.
- [ ] Verify: build passes; visual check shows 9 done rows with real winners, Spa highlighted next.
- [ ] Commit `add calendar view`.

### Task 4: Standings view + favorite driver

**Files:** `app/standings/page.tsx`, `lib/favorite.tsx`, `components/driver-row.tsx`; sidebar gets favorite picker.

**Interfaces produced:**
```ts
// lib/favorite.tsx ("use client")
export function FavoriteProvider({ children }): JSX.Element; // state + localStorage('apex-favorite'), value = familyName or ''
export function useFavorite(): { favorite: string; setFavorite(name: string): void };
```
`<DriverRow familyName color pos name team gap pts>` (client): highlight (red bg/border, prototype line 592) when `favorite === familyName`. Sidebar picker: plain `<select>` styled dark, options = familyNames from standings (passed as prop), first option "No favorite".

Port prototype lines 315–349: left card drivers table (zebra rows), right sticky constructors card with points bars (`width = pts / leader pts`).

- [ ] Implement provider (mounted in layout), picker, page.
- [ ] Verify: build; picking a favorite highlights row instantly and survives reload.
- [ ] Commit `add standings view with favorite driver highlight`.

### Task 5: History view

**Files:** `app/history/page.tsx`.

**Consumes:** `getDriverStandings()` (wins field, filter `wins > 0`, bar width = wins / max wins — prototype lines 434–450) and `getChampions()` (lines 451–464). The prototype's summary sentences under each card are derived copy — compute simple real equivalents (poles are not in Jolpica; drop that clause, keep e.g. "X leads the season on wins" from data we have).

- [ ] Implement page.
- [ ] Verify: build; wins chart matches Jolpica wins (ANT 5, RUS 2, HAM 1, LEC 1), champions list ends 2025 Norris.
- [ ] Commit `add history view`.

### Task 6: Overview view + circuit map

**Files:** `app/page.tsx`, `components/countdown.tsx`, `components/track-map.tsx`, server helpers in `lib/openf1.ts`.

**Interfaces produced:**
```ts
// lib/openf1.ts (server part)
export async function getTrackOutline(country: string): Promise<{ x: number; y: number }[] | null>;
// sessions?country_name=X&session_name=Race sorted by date_start desc, first with date_start < now
// (search year 2026 then 2025 then 2024); null if none (e.g. Madrid pre-debut).
// Then: drivers → first driver_number; laps → lap with lap_number 2 and non-null lap_duration
// (else first with duration); location between date_start and date_start + lap_duration.
// Cache: fetch with { next: { revalidate: 604800 } }.
```
`<TrackMap points>` renders `<svg viewBox="0 0 100 100">` with points normalized to fit (padding 8), `<polyline fill="none" stroke="#F5F3F1" strokeOpacity=0.9 strokeWidth=2 strokeLinejoin/cap="round">` plus a subtle red glow copy underneath (same polyline, stroke `#E10600`, opacity 0.35, width 5, blur filter).

`<Countdown targetIso>` (client): `useState(now)` + 1 s interval, renders the four boxes (prototype lines 194–211) via `countdownParts`; render "--" until mounted to dodge hydration mismatch.

Page assembles (prototype lines 180–289): hero (NEXT RACE labels, name, circuit + local time line, countdown, track map right panel — fallback = stat block with round/country/date if `getTrackOutline` returns null); second row grid `1.15fr 1fr 1fr`: telemetry preview card (static "No live session" variant, lines 237–243, whole card links to `/telemetry`, next session line from calendar sessions), LAST RACE card (`getLastRace()`, podium rows), CHAMPIONSHIP card (top 5 + summary line "X leads Y by N pts · Team lead constructors on M" computed from standings). Header right shows real date + `{round} of 22 rounds complete`.

- [ ] Implement `getTrackOutline`, `<TrackMap>`, `<Countdown>`, page.
- [ ] Verify: build; hero shows live-ticking countdown to Spa and a recognizable Spa outline (eau rouge kink visible = sanity check).
- [ ] Commit `add overview with countdown and real circuit map`.

### Task 7: Replay engine

**Files:** client part of `lib/openf1.ts`, `lib/replay.ts`, `lib/replay.test.ts`.

**Interfaces produced:**
```ts
// lib/openf1.ts (client part) — plain fetch, no caching options
export type Session = { key: number; name: string; location: string; start: string; end: string; isRace: boolean };
export type OF1Driver = { number: number; acronym: string; lastName: string; teamName: string; color: string };
export async function getPastSessions(): Promise<Session[]>;      // year=2026 (+2025 if empty), date_start < now, desc
export async function getSessionDrivers(key: number): Promise<OF1Driver[]>;
export async function getCarData(key: number, driver: number): Promise<CarSample[]>;   // {t:number(ms), speed, gear, throttle, brake}
export async function getPositions(key: number): Promise<PosSample[]>;                 // {t, driver, position}
export async function getStints(key: number): Promise<Stint[]>;
export async function getLaps(key: number, driver: number): Promise<Lap[]>;            // {lap, t, duration}
export async function getIntervalWindow(key: number, fromMs: number, toMs: number): Promise<IntervalSample[]>;

// lib/replay.ts — PURE, bun tested
export function indexAtTime(times: number[], t: number): number; // binary search: last index with times[i] <= t, -1 if none
export function orderAtTime(pos: PosSample[], t: number): number[]; // driver numbers sorted by latest position ≤ t
export function currentLap(laps: Lap[], t: number): { lap: number; total: number; lastLap: string }; // lastLap '1:33.720' via formatLapTime
export function formatLapTime(seconds: number | null): string; // 93.72 → '1:33.720', null → '—'
export function compoundAtLap(stints: Stint[], lap: number): string; // 'M' etc, '—' if unknown
```
Replay state machine lives in `components/replay.tsx` (Task 8) as a hook `useReplay(session, driver)`: on selection, fetch car data + positions + stints + laps (`Promise.all`, loading state); `simTime` starts at session start (races: first car_data timestamp), advances by `speed × 250 ms` every 250 ms tick while playing; intervals fetched in a 30 s-window poll each time `simTime` crosses a 20 s boundary (race sessions only), keeping latest `gap_to_leader` per driver in a Map.
`// ponytail: tyre compound for every car uses the featured driver's lap number — ±1 lap wrong around pit stops; per-driver laps fetch if it matters.`

- [ ] Implement both lib files.
- [ ] `lib/replay.test.ts`: `indexAtTime` (empty, before-first, middle, past-end), `formatLapTime(93.72) === '1:33.720'`, `compoundAtLap` boundary, `orderAtTime` with a position change.
- [ ] Verify: `bun test` passes.
- [ ] Commit `add openf1 client and replay helpers`.

### Task 8: Telemetry view

**Files:** `components/replay.tsx`, `app/telemetry/page.tsx`.

Two states ported from prototype:
- **Idle** (lines 355–370): centered card "Pick a session to replay", the five session-chips replaced by the **session picker** (styled `<select>` listing `getPastSessions()`, default = most recent race) + **driver picker** (populated after session choice, default = favorite driver if present in session, else race leader) + red gradient button "Start replay".
- **Replaying** (lines 373–427): left card = featured driver (label `CAR {number} · {LASTNAME}`, "End replay" resets), 96 px speed readout, GEAR / LAP / LAST LAP boxes, throttle + brake bars — all driven by `carData[indexAtTime(times, simTime)]`. Right card = running order from `orderAtTime` (rows: pos, team color bar, acronym, team, tyre letter via `compoundAtLap`, gap — races show `gap_to_leader` formatted `+x.xx`/`Leader`, non-races `—`). Header keeps the pulsing LIVE pill but labeled `REPLAY · {SESSION}`.
- Transport row under the left card: play/pause button, speed toggle (1×/5×/20×), seek `<input type="range">` over session duration (seeking sets `simTime`; interval map resets).

- [ ] Implement hook + UI; page passes favorite via `useFavorite()`.
- [ ] Verify: build; replay British GP → speeds/gears change plausibly, order shows LEC leading late race, seek + speed work.
- [ ] Commit `add telemetry replay view`.

### Task 9: Responsive pass

**Files:** touch layout/sidebar/pages only with Tailwind breakpoint classes.

- [ ] `< lg`: sidebar becomes a fixed top bar (logo left, nav as horizontal scroll row, favorite picker collapses into it; next-race card hidden). Main gets `pt` clearance, `px-5`.
- [ ] All multi-column grids (`overview second row, standings, history, telemetry, calendar row grid`) stack to one column `< lg`; hero stacks map below text; countdown boxes shrink (`w-[72px]`, text 28 px).
- [ ] Verify: build; dev at 390 px wide — nothing overflows horizontally, all five views usable.
- [ ] Commit `responsive pass for mobile`.

### Task 10: Ship

- [ ] Update `PRODUCT.md` (features now real), delete `F1 Dashboard.html` bundle? **No** — keep as original artifact; it's referenced by PRODUCT.md. Keep.
- [ ] README via **write-readme** skill; LICENSE via **license-public-repos** skill; publish via **publish-repo** skill (public repo `f1-dash`).
- [ ] Vercel: user connects repo (or `vercel link` + git push). No `vercel deploy`. Confirm build on Vercel dashboard via MCP tools if asked.
- [ ] Final: `bun run build` + `bun run lint` clean.

## Risks

- OpenF1 whole-race `car_data` response (~21k rows) may be slow/heavy → if it times out, chunk into three `date>`-windowed requests and concatenate (same shape).
- `intervals` only exists for races; non-race running order shows no gaps (by design).
- Madrid GP (round 14) has no historical circuit data until its first weekend → stat-block fallback covers it.
- Jolpica ToU requires non-hammering: all fetches are server-side ISR-cached; champions weekly.
