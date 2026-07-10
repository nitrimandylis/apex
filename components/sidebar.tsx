"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/calendar", label: "Calendar" },
  { href: "/standings", label: "Standings" },
  { href: "/telemetry", label: "Telemetry" },
  { href: "/history", label: "History" },
];

type NextRaceCard = {
  round: number;
  name: string;
  detail: string; // e.g. "Spa · 19 Jul, 15:00"
};

export default function Sidebar({ nextRace }: { nextRace?: NextRaceCard }) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 flex h-screen w-[216px] flex-none flex-col gap-1.5 border-r border-white/[0.06] bg-white/[0.015] px-[18px] pt-[30px] pb-6 backdrop-blur-[20px]">
      <div className="flex items-center gap-[11px] px-2 pb-[26px]">
        <div
          className="h-3.5 w-3.5 rotate-45 rounded-[4px]"
          style={{
            background: "linear-gradient(135deg, #FF2A1F, #B50500)",
            boxShadow: "0 0 18px rgba(225,6,0,0.55)",
          }}
        />
        <div>
          <div className="text-[19px] leading-none font-bold tracking-[0.16em]">
            APEX
          </div>
          <div className="mt-1 text-[10.5px] tracking-[0.22em] text-[#F5F3F1]/45">
            2026 SEASON
          </div>
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-[11px] rounded-xl px-3.5 py-[11px] text-[14.5px] font-medium tracking-[0.02em] hover:bg-white/[0.06] hover:text-[#F5F3F1] ${
              active ? "bg-white/[0.06] text-[#F5F3F1]" : "text-[#F5F3F1]/58"
            }`}
          >
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{
                background: active ? "#E10600" : "rgba(245,243,241,0.18)",
                boxShadow: active ? "0 0 10px rgba(225,6,0,0.8)" : "none",
              }}
            />
            {item.label}
          </Link>
        );
      })}

      <div className="flex-1" />

      {nextRace && (
        <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-[15px] py-3.5">
          <div className="text-[10.5px] tracking-[0.18em] text-[#F5F3F1]/45">
            NEXT · ROUND {nextRace.round}
          </div>
          <div className="mt-[5px] text-[14.5px] font-semibold">
            {nextRace.name}
          </div>
          <div className="mt-0.5 text-xs text-[#F5F3F1]/55">
            {nextRace.detail}
          </div>
        </div>
      )}
    </div>
  );
}
