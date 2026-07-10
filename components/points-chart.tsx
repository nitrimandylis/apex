"use client";

import { useRef, useState } from "react";
import type { ProgressionLine, SeasonEvent } from "@/lib/progression";
import { TEAM_COLORS } from "@/lib/colors";

const W = 720;
const H = 260;
const PAD_L = 36;
const PAD_R = 78; // room for the name labels at line ends
const PAD_T = 14;
const PAD_B = 22;

// Interactive championship chart: every scoring event (sprints included)
// on the x-axis, a custom driver picker, and a hover readout. All drawn
// by hand — no chart library, no native controls.
export default function PointsChart({
  events,
  lines,
}: {
  events: SeasonEvent[];
  lines: ProgressionLine[];
}) {
  const topFive = lines.slice(0, 5).map((l) => l.driverId);
  const [selected, setSelected] = useState<Set<string>>(new Set(topFive));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const shown = lines.filter((l) => selected.has(l.driverId));
  const maxPoints = Math.max(
    50,
    Math.ceil(
      Math.max(1, ...shown.map((l) => l.cumulative[l.cumulative.length - 1])) /
        50,
    ) * 50,
  );

  const x = (i: number) =>
    PAD_L + (i / Math.max(1, events.length - 1)) * (W - PAD_L - PAD_R);
  const y = (pts: number) =>
    H - PAD_B - (pts / maxPoints) * (H - PAD_T - PAD_B);

  function toggle(driverId: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (svgX - PAD_L) / (W - PAD_L - PAD_R);
    const idx = Math.round(frac * (events.length - 1));
    if (idx >= 0 && idx < events.length) {
      setHoverIdx(idx);
    } else {
      setHoverIdx(null);
    }
  }

  const gridLines: number[] = [];
  for (let pts = 50; pts <= maxPoints; pts += 50) {
    gridLines.push(pts);
  }

  const hovered =
    hoverIdx !== null
      ? [...shown]
          .map((l) => ({ line: l, pts: l.cumulative[hoverIdx] }))
          .sort((a, b) => b.pts - a.pts)
      : [];

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="cursor-pointer rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 text-[12.5px] font-semibold hover:bg-white/[0.09]"
        >
          Drivers ({selected.size}) {pickerOpen ? "▴" : "▾"}
        </button>
        <button
          onClick={() => setSelected(new Set(topFive))}
          className="cursor-pointer rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-[#F5F3F1]/60 hover:bg-white/[0.05]"
        >
          Top 5
        </button>
        <button
          onClick={() =>
            setSelected(new Set(lines.slice(0, 10).map((l) => l.driverId)))
          }
          className="cursor-pointer rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-[#F5F3F1]/60 hover:bg-white/[0.05]"
        >
          Top 10
        </button>
        <button
          onClick={() => setSelected(new Set(lines.map((l) => l.driverId)))}
          className="cursor-pointer rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-[#F5F3F1]/60 hover:bg-white/[0.05]"
        >
          Everyone
        </button>
      </div>

      {/* Custom driver picker */}
      {pickerOpen && (
        <div className="absolute top-11 left-0 z-20 max-h-[320px] w-[280px] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#101014] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
          {lines.map((l) => {
            const color = TEAM_COLORS[l.constructorId] ?? "#B6BABD";
            const on = selected.has(l.driverId);
            return (
              <button
                key={l.driverId}
                onClick={() => toggle(l.driverId)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.05]"
              >
                <span
                  className="flex h-4 w-4 flex-none items-center justify-center rounded-[5px] border"
                  style={{
                    borderColor: on ? color : "rgba(255,255,255,0.2)",
                    background: on ? color : "transparent",
                  }}
                >
                  {on && (
                    <span className="text-[10px] font-bold text-[#060608]">
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className="h-3.5 w-[3px] rounded-full"
                  style={{ background: color }}
                />
                <span className="flex-1 text-[13px] font-medium">
                  {l.familyName}
                </span>
                <span className="text-[12px] text-[#F5F3F1]/40">
                  {l.cumulative[l.cumulative.length - 1]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {gridLines.map((pts) => (
          <g key={pts}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(pts)}
              y2={y(pts)}
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={PAD_L - 8}
              y={y(pts) + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(245,243,241,0.35)"
            >
              {pts}
            </text>
          </g>
        ))}
        {events.map((e, i) => (
          <text
            key={e.label}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={e.kind === "sprint" ? 7.5 : 9}
            fill={
              e.kind === "sprint"
                ? "rgba(255,209,46,0.5)"
                : "rgba(245,243,241,0.35)"
            }
          >
            {e.label}
          </text>
        ))}

        {hoverIdx !== null && (
          <line
            x1={x(hoverIdx)}
            x2={x(hoverIdx)}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="rgba(245,243,241,0.25)"
            strokeDasharray="3 3"
          />
        )}

        {shown.map((line) => {
          const color = TEAM_COLORS[line.constructorId] ?? "#B6BABD";
          const path = line.cumulative
            .map((pts, i) => `${x(i).toFixed(1)},${y(pts).toFixed(1)}`)
            .join(" ");
          const lastIdx = line.cumulative.length - 1;
          return (
            <g key={line.driverId}>
              <polyline
                points={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {line.cumulative.map((pts, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(pts)}
                  r={hoverIdx === i ? 3.4 : 2}
                  fill={color}
                />
              ))}
              <text
                x={x(lastIdx) + 8}
                y={y(line.cumulative[lastIdx]) + 3.5}
                fontSize="10"
                fontWeight="600"
                fill={color}
              >
                {line.familyName}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover readout */}
      {hoverIdx !== null && hovered.length > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-white/[0.1] bg-[#101014]/95 px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.55)]"
          style={{
            left: `${Math.min(82, (x(hoverIdx) / W) * 100)}%`,
            top: 44,
          }}
        >
          <div className="mb-1 text-[10px] font-bold tracking-[0.16em] text-[#F5F3F1]/45">
            {events[hoverIdx].kind === "sprint" ? "SPRINT · ROUND" : "ROUND"}{" "}
            {events[hoverIdx].round}
          </div>
          {hovered.slice(0, 8).map(({ line, pts }) => (
            <div
              key={line.driverId}
              className="flex items-center gap-2 py-px text-[12px]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: TEAM_COLORS[line.constructorId] ?? "#B6BABD",
                }}
              />
              <span className="w-[92px] truncate font-medium">
                {line.familyName}
              </span>
              <span className="font-bold">{pts}</span>
            </div>
          ))}
          {hovered.length > 8 && (
            <div className="pt-0.5 text-[10.5px] text-[#F5F3F1]/40">
              +{hovered.length - 8} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
