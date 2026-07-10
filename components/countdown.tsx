"use client";

import { useEffect, useState } from "react";
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
        className="text-[26px] leading-none font-bold lg:text-[34px]"
        style={accent ? { color: "#FF564E" } : undefined}
      >
        {value}
      </div>
      <div
        className="mt-1.5 text-[10.5px] tracking-[0.2em]"
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
  // "--" until mounted so the server and browser never render different times.
  const [parts, setParts] = useState({
    days: "--",
    hours: "--",
    mins: "--",
    secs: "--",
  });

  useEffect(() => {
    function tick() {
      setParts(countdownParts(targetIso, new Date()));
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  return (
    <div className="mt-[26px] flex gap-2.5 lg:gap-3.5">
      <Box value={parts.days} label="DAYS" />
      <Box value={parts.hours} label="HRS" />
      <Box value={parts.mins} label="MIN" />
      <Box value={parts.secs} label="SEC" accent />
    </div>
  );
}
