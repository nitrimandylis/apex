"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFavorite } from "@/lib/favorite";

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

export default function Sidebar({
  nextRace,
  drivers = [],
}: {
  nextRace?: NextRaceCard;
  drivers?: string[];
}) {
  const pathname = usePathname();
  const { favorite, setFavorite } = useFavorite();

  const logo = (
    <div
      className="h-3.5 w-3.5 flex-none rotate-45 rounded-[4px]"
      style={{
        background: "linear-gradient(135deg, #FF2A1F, #B50500)",
        boxShadow: "0 0 18px rgba(225,6,0,0.55)",
      }}
    />
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#060608]/90 px-4 pt-3 pb-2 backdrop-blur-[20px] lg:hidden">
        <div className="flex items-center gap-2.5 px-1 pb-2">
          {logo}
          <span className="text-base font-bold tracking-[0.16em]">APEX</span>
          <span className="text-[10px] tracking-[0.2em] text-[#F5F3F1]/45">
            2026
          </span>
          <div className="flex-1" />
          <select
            value={favorite}
            onChange={(e) => setFavorite(e.target.value)}
            className="max-w-[130px] cursor-pointer rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-xs text-[#F5F3F1] outline-none"
          >
            <option value="" className="bg-[#111114]">
              No favorite
            </option>
            {drivers.map((name) => (
              <option key={name} value={name} className="bg-[#111114]">
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap ${
                pathname === item.href
                  ? "bg-white/[0.08] text-[#F5F3F1]"
                  : "text-[#F5F3F1]/58"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen w-[216px] flex-none flex-col gap-1.5 border-r border-white/[0.06] bg-white/[0.015] px-[18px] pt-[30px] pb-6 backdrop-blur-[20px] lg:flex">
      <div className="flex items-center gap-[11px] px-2 pb-[26px]">
        {logo}
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

      {drivers.length > 0 && (
        <div className="mb-1.5 px-1">
          <div className="mb-1.5 px-1 text-[10.5px] tracking-[0.18em] text-[#F5F3F1]/45">
            FAVORITE DRIVER
          </div>
          <select
            value={favorite}
            onChange={(e) => setFavorite(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-[#F5F3F1] outline-none"
          >
            <option value="" className="bg-[#111114]">
              No favorite
            </option>
            {drivers.map((name) => (
              <option key={name} value={name} className="bg-[#111114]">
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

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
    </>
  );
}
