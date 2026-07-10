"use client";

import { useFavorite } from "@/lib/favorite";

// One row of the drivers championship table. Client component so it can
// highlight itself when it matches the locally stored favorite driver.
export default function DriverRow({
  pos,
  name,
  familyName,
  team,
  color,
  gap,
  pts,
  zebra,
}: {
  pos: number;
  name: string;
  familyName: string;
  team: string;
  color: string;
  gap: string;
  pts: number;
  zebra: boolean;
}) {
  const { favorite } = useFavorite();
  const isFav = favorite !== "" && favorite === familyName;

  return (
    <div
      className="flex items-center gap-3.5 rounded-xl border px-3.5 py-[9px]"
      style={{
        background: isFav
          ? "rgba(225,6,0,0.09)"
          : zebra
            ? "rgba(255,255,255,0.025)"
            : "transparent",
        borderColor: isFav ? "rgba(225,6,0,0.4)" : "transparent",
      }}
    >
      <div className="w-6 text-[13px] font-bold text-[#F5F3F1]/40">{pos}</div>
      <div
        className="h-[18px] w-[3px] rounded-full"
        style={{ background: color }}
      />
      <div className="w-[130px] text-[14.5px] font-medium lg:w-[170px]">
        {name}
      </div>
      <div className="min-w-0 flex-1 truncate text-[12.5px] text-[#F5F3F1]/45">
        {team}
      </div>
      <div className="w-11 text-right text-[12.5px] text-[#F5F3F1]/40">
        {gap}
      </div>
      <div className="w-11 text-right text-[14.5px] font-bold">{pts}</div>
    </div>
  );
}
