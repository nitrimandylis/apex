"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { countdownParts } from "@/lib/format";

function Box({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="w-[68px] rounded-2xl border py-3.5 text-center lg:w-[86px]"
      style={{
        background: accent ? "rgba(225,6,0,0.10)" : "rgba(255,255,255,0.04)",
        borderColor: accent ? "rgba(225,6,0,0.35)" : "rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="text-subhead leading-none font-bold lg:text-display-sm"
        style={accent ? { color: "#FF564E" } : undefined}
      >
        {value}
      </div>
      <div
        className="mt-1.5 text-micro tracking-[0.2em]"
        style={{
          color: accent ? "rgba(255,86,78,0.7)" : "rgba(245,243,241,0.45)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Countdown({ targetIso }: { targetIso: string }) {
  const router = useRouter();
  // "--" until mounted so the server and browser never render different times.
  const [parts, setParts] = useState({
    days: "--",
    hours: "--",
    mins: "--",
    secs: "--",
  });

  useEffect(() => {
    let refreshed = false;
    function tick() {
      const now = new Date();
      setParts(countdownParts(targetIso, now));
      // The race has started: ask the server for the next one. This also
      // covers the home-screen app, which iOS resumes days later with the
      // old page still in memory. Once per target, so a slow server clock
      // can't cause a refresh every second.
      if (!refreshed && now.getTime() >= new Date(targetIso).getTime()) {
        refreshed = true;
        router.refresh();
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetIso, router]);

  return (
    // transform-gpu: its own compositing layer. Inside the blurred hero card,
    // iOS Safari skipped repainting boxes that change once (days, hrs, min)
    // and kept showing "--" until a scroll forced a repaint.
    <div className="mt-[26px] flex transform-gpu gap-2.5 lg:gap-3.5">
      <Box value={parts.days} label="DAYS" />
      <Box value={parts.hours} label="HRS" />
      <Box value={parts.mins} label="MIN" />
      <Box value={parts.secs} label="SEC" accent />
    </div>
  );
}
