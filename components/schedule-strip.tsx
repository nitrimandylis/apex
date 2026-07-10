"use client";

import { useEffect, useState } from "react";

// The next race weekend's sessions as a chip strip, in circuit time plus
// the visitor's own time. Circuit time is computed with an explicit
// timezone so the server-rendered HTML is identical for everyone; the
// visitor's line only renders after mount (their timezone is unknowable
// on the server).
export default function ScheduleStrip({
  sessions,
  now,
  tz,
}: {
  sessions: { label: string; start: string }[];
  now: number;
  tz: string;
}) {
  const [localTz, setLocalTz] = useState("");
  useEffect(() => {
    // Deliberate one-time sync set: the visitor's timezone only exists in
    // the browser, and the server must render without the local line first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const nextIdx = sessions.findIndex((s) => new Date(s.start).getTime() > now);
  const showLocal = localTz !== "" && localTz !== tz;
  // The race chip is always the red one; past sessions just dim.
  const highlight = (label: string) => label === "RACE";

  function fmt(iso: string, timeZone: string) {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-GB", { weekday: "short", timeZone });
    const time = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
    return `${day} · ${time}`;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {sessions.map((s, i) => {
        const isNext = highlight(s.label);
        const isPast = nextIdx === -1 || i < nextIdx;
        return (
          <div
            key={s.label}
            className="min-w-[112px] flex-1 rounded-[14px] border px-4 py-3"
            style={{
              background: isNext ? "rgba(225,6,0,0.10)" : "rgba(255,255,255,0.035)",
              borderColor: isNext ? "rgba(225,6,0,0.35)" : "rgba(255,255,255,0.07)",
              opacity: isPast ? 0.5 : 1,
            }}
          >
            <div
              className="text-[11px] tracking-[0.16em]"
              style={{
                color: isNext ? "rgba(255,86,78,0.8)" : "rgba(245,243,241,0.45)",
              }}
            >
              {s.label}
            </div>
            <div
              className="mt-[5px] text-sm font-semibold"
              style={isNext ? { color: "#FF564E" } : undefined}
            >
              {fmt(s.start, tz)}
              <span className="ml-1 text-[10px] font-normal text-[#F5F3F1]/35">
                circuit
              </span>
            </div>
            {showLocal && (
              <div className="mt-0.5 text-[12px] text-[#F5F3F1]/50">
                {fmt(s.start, localTz)}
                <span className="ml-1 text-[10px] text-[#F5F3F1]/35">
                local
              </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
