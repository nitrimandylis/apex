// Draws a circuit outline from one lap of real car position data.
// `mini` drops the glow layer for small thumbnail use.
// `dot` is a live car position in the same raw telemetry coordinates —
// it gets the identical normalization as the outline.
export default function TrackMap({
  points,
  mini = false,
  dot = null,
}: {
  points: { x: number; y: number }[];
  mini?: boolean;
  dot?: { x: number; y: number } | null;
}) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Fit into a 100×100 viewBox, keeping the track's aspect ratio.
  const pad = 8;
  const scale = (100 - 2 * pad) / Math.max(maxX - minX, maxY - minY);
  const offsetX = (100 - (maxX - minX) * scale) / 2;
  const offsetY = (100 - (maxY - minY) * scale) / 2;

  function toSvg(p: { x: number; y: number }) {
    const x = offsetX + (p.x - minX) * scale;
    // Flip y: telemetry y grows north, SVG y grows down.
    const y = 100 - (offsetY + (p.y - minY) * scale);
    return { x, y };
  }

  const path = points
    .map((p) => {
      const { x, y } = toSvg(p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const dotSvg = dot ? toSvg(dot) : null;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {!mini && (
        <polyline
          points={path}
          fill="none"
          stroke="#E10600"
          strokeOpacity={0.35}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "blur(3px)" }}
        />
      )}
      <polyline
        points={path}
        fill="none"
        stroke="#F5F3F1"
        strokeOpacity={mini ? 0.55 : 0.9}
        strokeWidth={mini ? 3 : 2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dotSvg && (
        <>
          <circle
            cx={dotSvg.x}
            cy={dotSvg.y}
            r="5"
            fill="#E10600"
            opacity="0.35"
            style={{ filter: "blur(2px)" }}
          />
          <circle cx={dotSvg.x} cy={dotSvg.y} r="2.6" fill="#FF2A1F" />
        </>
      )}
    </svg>
  );
}
