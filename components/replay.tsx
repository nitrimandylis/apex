"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/page-header";
import { useFavorite } from "@/lib/favorite";
import { colorForTeamName, TYRE_COLORS } from "@/lib/colors";
import {
  getCarData,
  getIntervalWindow,
  getLaps,
  getPastSessions,
  getPositions,
  getSessionDrivers,
  getStints,
  type CarSample,
  type Lap,
  type OF1Driver,
  type PosSample,
  type Session,
  type Stint,
} from "@/lib/openf1";
import {
  compoundAtLap,
  currentLap,
  formatGap,
  indexAtTime,
  orderAtTime,
} from "@/lib/replay";

const SPEEDS = [1, 5, 20];

type LoadedData = {
  carData: CarSample[];
  positions: PosSample[];
  stints: Stint[];
  laps: Lap[];
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
          className="h-full rounded-full"
          style={{ background: gradient, width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function Replay() {
  const { favorite } = useFavorite();

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
  const lastGapFetch = useRef(0);

  const session = sessions.find((s) => s.key === sessionKey) ?? null;
  const driver = drivers.find((d) => d.number === driverNumber) ?? null;

  // Load the session list once.
  useEffect(() => {
    getPastSessions()
      .then((list) => {
        setSessions(list);
        const lastRace = list.find((s) => s.isRace);
        setSessionKey((lastRace ?? list[0])?.key ?? null);
      })
      .catch(() => setError("Could not load sessions from OpenF1."));
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
          (d) => d.lastName.toLowerCase() === favorite.toLowerCase(),
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
      const [carData, positions, stints, laps] = await Promise.all([
        getCarData(sessionKey, driverNumber, session.start, session.end),
        getPositions(sessionKey),
        getStints(sessionKey),
        getLaps(sessionKey, driverNumber),
      ]);
      if (carData.length === 0) {
        throw new Error("no car data");
      }
      carData.sort((a, b) => a.t - b.t);
      positions.sort((a, b) => a.t - b.t);
      laps.sort((a, b) => a.t - b.t);
      setData({ carData, positions, stints, laps });
      setSimTime(carData[0].t);
      setGaps(new Map());
      lastGapFetch.current = 0;
      setPaused(false);
      setPhase("playing");
    } catch {
      setError("Could not load telemetry for this combination. Try another session.");
      setPhase("idle");
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

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.1fr]">
        {/* Featured car */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[30px] py-7 backdrop-blur-[18px]">
          <div className="flex items-center">
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
              CAR {driver?.number} · {driver?.lastName.toUpperCase()}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setPhase("idle")}
              className="cursor-pointer text-xs text-[#F5F3F1]/45 hover:text-[#FF564E]"
            >
              End replay
            </button>
          </div>

          <div className="mt-[22px] flex items-baseline gap-3">
            <div className="text-[64px] leading-none font-bold tracking-[-0.02em] lg:text-[96px]">
              {sample.speed}
            </div>
            <div className="text-base text-[#F5F3F1]/50">km/h</div>
          </div>

          <div className="mt-[26px] flex gap-3.5">
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

          {/* Transport */}
          <div className="mt-7 flex items-center gap-3.5 border-t border-white/[0.06] pt-5">
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
            <input
              type="range"
              min={sessionStart}
              max={sessionEnd}
              value={Math.min(simTime, sessionEnd)}
              onChange={(e) => setSimTime(Number(e.target.value))}
              className="flex-1 accent-[#E10600]"
            />
            <div className="w-[34px] text-right text-xs text-[#F5F3F1]/45">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Running order */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-[30px] py-7 backdrop-blur-[18px]">
          <div className="mb-[18px] text-[11px] font-bold tracking-[0.2em] text-[#F5F3F1]/50">
            RUNNING ORDER · {session?.location.toUpperCase()}
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
                favorite !== "" &&
                d.lastName.toLowerCase() === favorite.toLowerCase();
              return (
                <div
                  key={number}
                  className="flex items-center gap-[13px] rounded-xl border px-3.5 py-2"
                  style={{
                    background:
                      i === 0
                        ? "rgba(225,6,0,0.07)"
                        : isFav
                          ? "rgba(225,6,0,0.05)"
                          : "rgba(255,255,255,0.02)",
                    borderColor: isFav ? "rgba(225,6,0,0.4)" : "transparent",
                  }}
                >
                  <div className="w-5 text-[13px] font-bold text-[#F5F3F1]/40">
                    {i + 1}
                  </div>
                  <div
                    className="h-4 w-[3px] rounded-full"
                    style={{ background: color }}
                  />
                  <div className="w-[52px] text-sm font-semibold tracking-[0.06em]">
                    {d.acronym}
                  </div>
                  <div className="flex-1 text-[12.5px] text-[#F5F3F1]/45">
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
