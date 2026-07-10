import type { ProgressionLine } from "@/lib/progression";
import { TEAM_COLORS } from "@/lib/colors";

// Static SVG line chart of cumulative championship points per round.
export default function PointsChart({
  rounds,
  lines,
}: {
  rounds: number[];
  lines: ProgressionLine[];
}) {
  const W = 720;
  const H = 240;
  const PAD_L = 34;
  const PAD_R = 74; // room for the name labels at line ends
  const PAD_Y = 18;

  const maxPoints = Math.max(
    50,
    Math.ceil(
      Math.max(...lines.map((l) => l.cumulative[l.cumulative.length - 1])) / 50,
    ) * 50,
  );

  const x = (roundIdx: number) =>
    PAD_L +
    (roundIdx / Math.max(1, rounds.length - 1)) * (W - PAD_L - PAD_R);
  const y = (pts: number) => H - PAD_Y - (pts / maxPoints) * (H - 2 * PAD_Y);

  const gridLines = [];
  for (let pts = 50; pts <= maxPoints; pts += 50) {
    gridLines.push(pts);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
      {rounds.map((r, i) => (
        <text
          key={r}
          x={x(i)}
          y={H - 3}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(245,243,241,0.35)"
        >
          R{r}
        </text>
      ))}

      {lines.map((line) => {
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
            <circle
              cx={x(lastIdx)}
              cy={y(line.cumulative[lastIdx])}
              r="3"
              fill={color}
            />
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
  );
}
