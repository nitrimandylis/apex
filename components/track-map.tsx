// Draws a circuit outline from one lap of real car position data.
// `mini` drops the glow layer for small thumbnail use.
export default function TrackMap({
  points,
  mini = false,
}: {
  points: { x: number; y: number }[];
  mini?: boolean;
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

  const path = points
    .map((p) => {
      const x = offsetX + (p.x - minX) * scale;
      // Flip y: telemetry y grows north, SVG y grows down.
      const y = 100 - (offsetY + (p.y - minY) * scale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

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
    </svg>
  );
}
