"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/logo";
import { useFavorite } from "@/lib/favorite";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview" },
  { href: "/calendar", label: "Calendar" },
  { href: "/standings", label: "Standings" },
  { href: "/telemetry", label: "Telemetry" },
  { href: "/history", label: "History" },
];

// Horizontal navigation — the alternative to the sidebar, chosen by the
// layout toggle. Serves every screen size.
export default function TopNav({
  nextRace,
  drivers = [],
  onSwitch,
}: {
  nextRace?: { round: number; name: string; detail: string };
  drivers?: string[];
  onSwitch: () => void;
}) {
  const pathname = usePathname();
  const { favorite, setFavorite } = useFavorite();

  return (
    <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#060608]/90 px-4 pt-3 pb-2 backdrop-blur-[20px] lg:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2">
        <div className="flex items-center gap-3">
          <Logo size={20} />
          <span className="text-base font-bold tracking-[0.16em]">APEX</span>
          <span className="text-[10px] tracking-[0.2em] text-[#F5F3F1]/45">
            2026 SEASON
          </span>
          <div className="flex-1" />
          {nextRace && (
            <div className="hidden text-[12px] text-[#F5F3F1]/50 xl:block">
              NEXT · R{nextRace.round} {nextRace.name} · {nextRace.detail}
            </div>
          )}
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
          <button
            onClick={onSwitch}
            title="Switch to sidebar"
            className="hidden cursor-pointer rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-xs text-[#F5F3F1]/60 hover:text-[#F5F3F1] lg:block"
          >
            ⇆ Sidebar
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium whitespace-nowrap hover:bg-white/[0.06] hover:text-[#F5F3F1] ${
                  active ? "bg-white/[0.08] text-[#F5F3F1]" : "text-[#F5F3F1]/58"
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
        </div>
      </div>
    </div>
  );
}
