# APEX — F1 Dashboard

A personal Formula 1 dashboard for the 2026 season. Dark glass UI, Outfit font, F1 red (#E10600), team-color accents — design is a faithful 1:1 port of the prototype in `F1 Dashboard.html` (self-extracting bundle; the real markup lives in its `__bundler/template` script tag).

## Decisions (grilled 2026-07-10)

- **Data: real APIs, no hardcoded season data.**
  - **Jolpica** (free Ergast successor) → calendar, results, driver/constructor standings, past champions. Server-side fetch with ISR caching (~1h revalidate) so visitors never hit Jolpica rate limits directly.
  - **OpenF1** (free historical tier) → telemetry. Real-time tier costs €9.90/mo — not used.
- **Telemetry = replay, not fake, not paid-live.** Stream a real past session from OpenF1 historical data at real speed. **Selectable session (FP/quali/race) and selectable featured driver** are in v1. Upgrade path to true live (OpenF1 paid or F1 SignalR) exists but is out of scope.
- **Stack:** Next.js, TypeScript, Tailwind, App Router. Each view is a route (`/`, `/calendar`, `/standings`, `/telemetry`, `/history`).
- **Scope v1:** all five views — Overview, Calendar, Standings, Telemetry, History.
- **Responsive:** desktop-first as designed; pragmatic mobile pass (sidebar collapses, grids stack) so it works on a phone on race day.
- **Personalization:** favorite-driver picker in sidebar, persisted in localStorage, highlights rows in standings/running order. `startView` prop dropped — routes replace it.
- **Circuit map:** drawn as SVG from real OpenF1 car-position data (one lap of location samples) — no licensed images, works for every circuit.
- **Name:** app is **APEX**, repo stays `f1-dash`.
- **Ship:** publish public on GitHub (README + LICENSE via publish-repo), deploy on Vercel via git push.

## Not doing

- True live telemetry (paid OpenF1 / unofficial F1 SignalR feed — the latter needs a persistent server that doesn't fit Vercel).
- FastF1 (Python library → would require a separate Python backend).
- Redesigning the prototype's aesthetic.
