"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/page-header";
import TrackMap from "@/components/track-map";
import Headshot from "@/components/headshot";
import { useFavorite } from "@/lib/favorite";
import { colorForTeamName, TYRE_COLORS } from "@/lib/colors";
import { outlineFor } from "@/lib/outlines";
import {
  getCarData,
  getIntervalWindow,
  getLaps,
  getLocationWindow,
  getPastSessions,
  getPositions,
  getRaceControl,
  getSessionDrivers,
  getStints,
  getTeamRadio,
  getWeather,
  type CarSample,
  type Lap,
  type LocationSample,
  type OF1Driver,
  type PosSample,
  type RaceControlMsg,
  type RadioClip,
  type Session,
  type Stint,
  type WeatherSample,
} from "@/lib/openf1";
import { nameKey } from "@/lib/format";
import {
  compoundAtLap,
  currentLap,
  formatElapsed,
  formatGap,
  indexAtTime,
  latestAtTime,
  orderAtTime,
} from "@/lib/replay";

const SPEEDS = [1, 5, 20];

type LoadedData = {
  carData: CarSample[];
  positions: PosSample[];
  stints: Stint[];
  laps: Lap[];
  weather: WeatherSample[];
  raceControl: RaceControlMsg[];
  radio: RadioClip[];
};

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-[18px] py-4">
      <div className="text-[11px] tracking-[0.16em] text-[#F5F3F1]/45">
        {label}
      </div>
      <div className="mt-1.5 text-[30px] font-bold">{value}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  gradient,
}: {
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <div className="mt-[18px]">
      <div className="flex justify-between text-[11px] tracking-[0.14em] text-[#F5F3F1]/45">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: gradient,
            transform: `scaleX(${value / 100})`,
            transformOrigin: "left",
            transition: "transform 200ms linear",
          }}
        />
      </div>
    </div>
  );
}

export default function Replay() {
  const { favorite } = useFavorite();
  const requestedSession = useSearchParams().get("session");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<OF1Driver[]>([]);
  const [driverNumber, setDriverNumber] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const [data, setData] = useState<LoadedData | null>(null);
  const [simTime, setSimTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // default 5x
  const [gaps, setGaps] = useState<Map<number, number | null>>(new Map());
  const [locations, setLocations] = useState<LocationSample[]>([]);
  const [switching, setSwitching] = useState(false);
  const lastGapFetch = useRef(0);
  const lastLocFetch = useRef(0);
  const wantedDriver = useRef<number | null>(null);

  const session = sessions.find((s) => s.key === sessionKey) ?? null;
  const driver = drivers.find((d) => d.number === driverNumber) ?? null;

  // Load the session list once.
  useEffect(() => {
    getPastSessions()
      .then((list) => {
        setSessions(list);
        // Deep link from a race page wins; otherwise default to the last race.
        const requested = list.find((s) => String(s.key) === requestedSession);
        const lastRace = list.find((s) => s.isRace);
        setSessionKey((requested ?? lastRace ?? list[0])?.key ?? null);
      })
      .catch(() => setError("Could not load sessions from OpenF1."));
    // The query param only matters on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the driver list whenever the chosen session changes.
  useEffect(() => {
    if (sessionKey === null) {
      return;
    }
    getSessionDrivers(sessionKey)
      .then((list) => {
        setDrivers(list);
        const fav = list.find(
          (d) => nameKey(d.lastName) === nameKey(favorite),
        );
        setDriverNumber((fav ?? list[0])?.number ?? null);
      })
      .catch(() => setError("Could not load drivers for this session."));
    // The favorite only matters for the initial default, not as a live dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  async function startReplay() {
    if (sessionKey === null || driverNumber === null) {
      return;
    }
    if (!session) {
      return;
    }
    setPhase("loading");
    setError("");
    try {
      const [carData, positions, stints, laps, weather, raceControl, radio] =
        await Promise.all([
          getCarData(sessionKey, driverNumber, session.start, session.end),
          getPositions(sessionKey),
          getStints(sessionKey),
          getLaps(sessionKey, driverNumber),
          getWeather(sessionKey).catch(() => []),
          getRaceControl(sessionKey).catch(() => []),
          getTeamRadio(sessionKey).catch(() => []),
        ]);
      if (carData.length === 0) {
        throw new Error("no car data");
      }
      carData.sort((a, b) => a.t - b.t);
      positions.sort((a, b) => a.t - b.t);
      laps.sort((a, b) => a.t - b.t);
      weather.sort((a, b) => a.t - b.t);
      raceControl.sort((a, b) => a.t - b.t);
      radio.sort((a, b) => a.t - b.t);
      setData({ carData, positions, stints, laps, weather, raceControl, radio });
      setSimTime(carData[0].t);
      setGaps(new Map());
      lastGapFetch.current = 0;
      setLocations([]);
      lastLocFetch.current = 0;
      setPaused(false);
      setPhase("playing");
    } catch {
      setError("Could not load telemetry for this combination. Try another session.");
      setPhase("idle");
    }
  }

  // Swap the featured car mid-replay: only car data and laps are
  // driver-specific; the clock, order, gaps and feeds keep running.
  async function switchDriver(number: number) {
    if (!session || sessionKey === null || number === driverNumber) {
      return;
    }
    setDriverNumber(number);
    wantedDriver.current = number;
    setSwitching(true);
    try {
      const [carData, laps] = await Promise.all([
        getCarData(sessionKey, number, session.start, session.end),
        getLaps(sessionKey, number),
      ]);
      if (wantedDriver.current !== number) {
        return; // user already clicked someone else
      }
      carData.sort((a, b) => a.t - b.t);
      laps.sort((a, b) => a.t - b.t);
      setData((old) => (old ? { ...old, carData, laps } : old));
      setLocations([]);
      lastLocFetch.current = 0;
    } catch {
      // keep showing the previous car rather than breaking the replay
    } finally {
      if (wantedDriver.current === number) {
        setSwitching(false);
      }
    }
  }

  // The replay clock: advance simulated time every 250 ms while playing.
  useEffect(() => {
    if (phase !== "playing" || paused) {
      return;
    }
    const timer = setInterval(() => {
      setSimTime((t) => t + 250 * SPEEDS[speedIdx]);
    }, 250);
    return () => clearInterval(timer);
  }, [phase, paused, speedIdx]);

  // Fetch race gaps in windows as the replay clock passes 20-second marks.
  useEffect(() => {
    if (phase !== "playing" || !session?.isRace || sessionKey === null) {
      return;
    }
    const boundary = Math.floor(simTime / 20000);
    if (boundary === lastGapFetch.current) {
      return;
    }
    lastGapFetch.current = boundary;
    getIntervalWindow(sessionKey, simTime - 30000, simTime)
      .then((rows) => {
        setGaps((old) => {
          const next = new Map(old);
          for (const row of rows) {
            next.set(row.driver, row.gapToLeader);
          }
          return next;
        });
      })
      .catch(() => {}); // gaps are cosmetic; skip a failed window
  }, [simTime, phase, session, sessionKey]);

  // Fetch car positions for the track-map dot in 60-second windows as the
  // clock passes 30-second marks.
  useEffect(() => {
    if (phase !== "playing" || sessionKey === null || driverNumber === null) {
      return;
    }
    const boundary = Math.floor(simTime / 30000);
    if (boundary === lastLocFetch.current) {
      return;
    }
    lastLocFetch.current = boundary;
    getLocationWindow(sessionKey, driverNumber, simTime - 5000, simTime + 65000)
      .then((rows) => {
        setLocations((old) => {
          const merged = [...old, ...rows];
          merged.sort((a, b) => a.t - b.t);
          // Drop everything older than 2 minutes of sim time.
          return merged.filter((r) => r.t > simTime - 120000);
        });
      })
      .catch(() => {}); // dot is cosmetic
  }, [simTime, phase, sessionKey, driverNumber]);

  const carTimes = useMemo(
    () => (data ? data.carData.map((c) => c.t) : []),
    [data],
  );
  const stintsByDriver = useMemo(() => {
    const map = new Map<number, Stint[]>();
    for (const s of data?.stints ?? []) {
      const list = map.get(s.driver) ?? [];
      list.push(s);
      map.set(s.driver, list);
    }
    return map;
  }, [data]);

  const sessionStart = data ? data.carData[0].t : 0;
  const sessionEnd = data ? data.carData[data.carData.length - 1].t : 0;

  // ---------- idle / loading ----------
  if (phase !== "playing" || !data) {
    return (
      <div>
        <PageHeader title="Telemetry" />
        <div className="flex flex-col items-center gap-2.5 rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-10 py-[70px] text-center backdrop-blur-[18px]">
          <div className="mb-2 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03]">
            <div className="h-2.5 w-2.5 rounded-full bg-[#F5F3F1]/25" />
          </div>
          <div className="text-2xl font-semibold">Replay a real session</div>
          <div className="max-w-[440px] text-[14.5px] leading-relaxed text-[#F5F3F1]/55">
            Pick any past session and watch its telemetry play back exactly as
            it happened — real speed, gears and gaps from the F1 cars.
          </div>

          <div className="mt-[22px] flex flex-wrap items-center justify-center gap-3">
            <select
              value={sessionKey ?? ""}
              onChange={(e) => setSessionKey(Number(e.target.value))}
              className="cursor-pointer rounded-[14px] border border-white/[0.07] bg-white/[0.035] px-5 py-3.5 text-sm font-medium text-[#F5F3F1] outline-none"
            >
              {sessions.map((s) => (
                <option key={s.key} value={s.key} className="bg-[#111114]">
                  {s.location} · {s.name} ·{" "}
                  {new Date(s.start).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </option>
              ))}
            </select>
            <select
              value={driverNumber ?? ""}
              onChange={(e) => setDriverNumber(Number(e.target.value))}
              className="cursor-pointer rounded-[14px] border border-white/[0.07] bg-white/[0.035] px-5 py-3.5 text-sm font-medium text-[#F5F3F1] outline-none"
            >
              {drivers.map((d) => (
                <option key={d.number} value={d.number} className="bg-[#111114]">
                  {d.acronym} · {d.teamName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={startReplay}
            disabled={phase === "loading" || sessionKey === null}
            className="mt-7 cursor-pointer rounded-full px-7 py-[13px] text-sm font-semibold tracking-[0.04em] disabled:cursor-default disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E10600, #A80400)",
              boxShadow: "0 10px 30px rgba(225,6,0,0.35)",
            }}
          >
            {phase === "loading" ? "Loading telemetry…" : "Start replay"}
          </button>
          {error && (
            <div className="mt-3 text-[13px] text-[#FF564E]">{error}</div>
          )}
        </div>
      </div>
    );
  }

  // ---------- playing ----------
  const idx = indexAtTime(carTimes, simTime);
  const sample = data.carData[Math.max(0, idx)];
  const lapInfo = currentLap(data.laps, simTime);
  const order = orderAtTime(data.positions, simTime);
  const progress = Math.min(
    100,
    ((simTime - sessionStart) / (sessionEnd - sessionStart)) * 100,
  );
  const outline = session ? outlineFor(session.location) : null;
  const carDot = latestAtTime(locations, simTime);
  const weatherNow = latestAtTime(data.weather, simTime);
  const rcFeed = data.raceControl.filter((m) => m.t <= simTime).slice(-5).reverse();
  const radioFeed = data.radio.filter((c) => c.t <= simTime).slice(-6).reverse();
  const flagColor = (flag: string | null) => {
    if (flag === "YELLOW" || flag === "DOUBLE YELLOW") return "#FFD12E";
    if (flag === "RED") return "#FF564E";
    if (flag === "GREEN" || flag === "CLEAR") return "#43B02A";
    return "rgba(245,243,241,0.4)";
  };

  return (
    <div>
      <PageHeader title="Telemetry">
        <div className="flex items-center gap-2 rounded-full border border-[#E10600]/40 bg-[#E10600]/[0.12] px-3.5 py-[7px]">
          <span
            className="h-[7px] w-[7px] rounded-full bg-[#E10600]"
            style={{ animation: "livepulse 1.2s infinite" }}
          />
          <span className="text-[11.5px] font-semibold tracking-[0.16em] text-[#FF6A63]">
            REPLAY · {session?.location.toUpperCase()} ·{" "}
            {session?.name.toUpperCase()}
          </span>
        </div>
      </PageHeader>

      {/* Transport bar — the media player for the whole replay */}
      <div className="mb-5 flex flex-wrap items-center gap-3.5 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 backdrop-blur-[18px]">
        <button
          onClick={() => setPaused((p) => !p)}
          className="w-[86px] cursor-pointer rounded-full border border-white/[0.1] bg-white/[0.05] py-2 text-[13px] font-semibold hover:bg-white/[0.09]"
        >
          {paused ? "Play" : "Pause"}
        </button>
        <button
          onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
          className="w-[52px] cursor-pointer rounded-full border border-white/[0.1] bg-white/[0.05] py-2 text-[13px] font-semibold hover:bg-white/[0.09]"
        >
          {SPEEDS[speedIdx]}×
        </button>
        <div className="w-[52px] text-right text-xs font-semibold text-[#F5F3F1]/60">
          {formatElapsed(simTime - sessionStart)}
        </div>
        <input
          type="range"
          min={sessionStart}
          max={sessionEnd}
          value={Math.min(simTime, sessionEnd)}
          onChange={(e) => setSimTime(Number(e.target.value))}
          className="min-w-[140px] flex-1 accent-[#E10600]"
        />
        <div className="w-[34px] text-right text-xs text-[#F5F3F1]/45">
          {Math.round(progress)}%
        </div>
        <div className="h-5 w-px bg-white/[0.08]" />
        <button
          onClick={() => setPhase("idle")}
          className="cursor-pointer text-xs text-[#F5F3F1]/45 hover:text-[#FF564E]"
        >
          End replay
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.05fr]">
        {/* Left column: car gauges + track */}
        <div className="flex flex-col gap-5">
          {/* Featured car */}
          <div
            className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]"
            style={switching ? { opacity: 0.55 } : undefined}
          >
            <div className="flex items-center gap-3">
              {driver && (
                <Headshot
                  src={driver.headshot}
                  name={driver.lastName}
                  color={colorForTeamName(driver.teamName)}
                  size={36}
                />
              )}
              <div className="text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
                CAR {driver?.number} · {driver?.lastName.toUpperCase()}
              </div>
              {switching && (
                <div className="text-[11px] text-[#FF564E]">loading…</div>
              )}
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <div className="text-[64px] leading-none font-bold tracking-[-0.02em] lg:text-[76px]">
                  {sample.speed}
                </div>
                <div className="text-[15px] text-[#F5F3F1]/50">km/h</div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <StatBox label="GEAR" value={String(sample.gear)} />
              <StatBox
                label="LAP"
                value={lapInfo.lap > 0 ? `${lapInfo.lap} / ${lapInfo.total}` : "—"}
              />
              <StatBox label="LAST LAP" value={lapInfo.lastLap} />
            </div>

            <Bar
              label="THROTTLE"
              value={sample.throttle}
              gradient="linear-gradient(90deg, #B50500, #FF2A1F)"
            />
            <Bar
              label="BRAKE"
              value={sample.brake}
              gradient="rgba(245,243,241,0.75)"
            />
          </div>

          {/* Track map + weather */}
          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
            <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
              TRACK · {driver?.acronym}
            </div>
            {outline ? (
              <div className="h-[220px]">
                <TrackMap
                  points={outline}
                  dot={carDot ? { x: carDot.x, y: carDot.y } : null}
                  draw
                />
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-[13px] text-[#F5F3F1]/40">
                No track geometry for this circuit yet
              </div>
            )}
            {weatherNow && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {[
                  ["TRACK", `${weatherNow.trackTemp.toFixed(1)}°`],
                  ["AIR", `${weatherNow.airTemp.toFixed(1)}°`],
                  ["WIND", `${weatherNow.windSpeed.toFixed(1)} m/s`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="tracking-[0.14em] text-[#F5F3F1]/40">
                      {label}{" "}
                    </span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
                <div
                  className="rounded-lg border px-2.5 py-1.5 text-[11px]"
                  style={{
                    borderColor: weatherNow.rainfall
                      ? "rgba(0,144,255,0.5)"
                      : "rgba(255,255,255,0.07)",
                    background: weatherNow.rainfall
                      ? "rgba(0,144,255,0.12)"
                      : "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="tracking-[0.14em] text-[#F5F3F1]/40">
                    RAIN{" "}
                  </span>
                  <span className="font-semibold">
                    {weatherNow.rainfall ? "YES" : "NO"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: full running order */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
          <div className="mb-[18px] text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            RUNNING ORDER · {session?.location.toUpperCase()}
            <span className="ml-2 font-normal tracking-normal text-[#F5F3F1]/30 normal-case">
              — click a driver to follow their car
            </span>
          </div>
          <div className="flex flex-col gap-[7px]">
            {order.map((number, i) => {
              const d = drivers.find((x) => x.number === number);
              if (!d) {
                return null;
              }
              const color = colorForTeamName(d.teamName);
              // ponytail: every car uses the featured driver's lap number for
              // its tyre lookup — ±1 lap wrong around pit stops.
              const tyre = compoundAtLap(
                stintsByDriver.get(number) ?? [],
                lapInfo.lap,
              );
              const gap = session?.isRace
                ? formatGap(i === 0 ? null : (gaps.get(number) ?? null))
                : "—";
              const isFav =
                favorite !== "" && nameKey(d.lastName) === nameKey(favorite);
              const isFeatured = number === driverNumber;
              return (
                <button
                  key={number}
                  onClick={() => switchDriver(number)}
                  className="flex w-full cursor-pointer items-center gap-[13px] rounded-xl border px-3.5 py-2 text-left hover:border-white/[0.18]"
                  style={{
                    background:
                      i === 0
                        ? "rgba(225,6,0,0.07)"
                        : isFav
                          ? "rgba(225,6,0,0.05)"
                          : "rgba(255,255,255,0.02)",
                    borderColor: isFeatured
                      ? "rgba(245,243,241,0.35)"
                      : isFav
                        ? "rgba(225,6,0,0.4)"
                        : "transparent",
                  }}
                >
                  <div className="w-5 text-[13px] font-bold text-[#F5F3F1]/40">
                    {isFeatured ? "▶" : i + 1}
                  </div>
                  <Headshot src={d.headshot} name={d.lastName} color={color} size={24} />
                  <div
                    className="h-4 w-[3px] rounded-full"
                    style={{ background: color }}
                  />
                  <div className="w-[52px] text-sm font-semibold tracking-[0.06em]">
                    {d.acronym}
                  </div>
                  <div className="hidden min-w-0 flex-1 truncate text-[12.5px] text-[#F5F3F1]/45 sm:block">
                    {d.teamName}
                  </div>
                  <div
                    className="w-5 text-center text-xs font-bold"
                    style={{ color: TYRE_COLORS[tyre] ?? "#F5F3F1" }}
                  >
                    {tyre}
                  </div>
                  <div className="w-[70px] text-right text-[13px] text-[#F5F3F1]/75">
                    {gap}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: race control + team radio */}
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Race control */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
          <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            RACE CONTROL
          </div>
          <div className="flex flex-col gap-2.5">
            {rcFeed.length === 0 && (
              <div className="py-6 text-center text-[13px] text-[#F5F3F1]/40">
                No messages yet
              </div>
            )}
            {rcFeed.map((m) => (
              <div key={m.t + m.message} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                  style={{ background: flagColor(m.flag) }}
                />
                <div className="min-w-0">
                  <div className="text-[12.5px] leading-snug text-[#F5F3F1]/80">
                    {m.message}
                  </div>
                  <div className="text-[10.5px] tracking-[0.1em] text-[#F5F3F1]/35">
                    {formatElapsed(m.t - sessionStart)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team radio */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[26px] py-6 backdrop-blur-[18px]">
          <div className="mb-4 text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            TEAM RADIO
          </div>
          <div className="flex flex-col gap-2.5">
            {radioFeed.length === 0 && (
              <div className="py-6 text-center text-[13px] text-[#F5F3F1]/40">
                No radio yet
              </div>
            )}
            {radioFeed.map((clip) => {
              const d = drivers.find((x) => x.number === clip.driver);
              return (
                <div key={clip.url} className="flex items-center gap-2.5">
                  <div
                    className="h-4 w-[3px] flex-none rounded-full"
                    style={{
                      background: d ? colorForTeamName(d.teamName) : "#B6BABD",
                    }}
                  />
                  <div className="w-11 flex-none text-[12.5px] font-semibold tracking-[0.06em]">
                    {d?.acronym ?? `#${clip.driver}`}
                  </div>
                  <div className="w-12 flex-none text-[10.5px] text-[#F5F3F1]/35">
                    {formatElapsed(clip.t - sessionStart)}
                  </div>
                  <audio
                    controls
                    preload="none"
                    src={clip.url}
                    className="h-7 min-w-0 flex-1"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
