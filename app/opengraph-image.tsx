import { ImageResponse } from "next/og";
import outlines from "@/lib/track-outlines.json";

export const alt = "APEX — F1 Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The social card: APEX mark + wordmark, with the real Spa outline
// (from telemetry, like everything else here) ghosted on the right.
export default function OpenGraphImage() {
  const spa = (outlines as Record<string, { points: { x: number; y: number }[] }>)
    .Spa.points;

  const xs = spa.map((p) => p.x);
  const ys = spa.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = 560 / Math.max(maxX - minX, maxY - minY);
  const track = spa
    .map((p) => {
      const x = (p.x - minX) * scale;
      const y = 560 - (p.y - minY) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#060608",
          backgroundImage:
            "radial-gradient(900px 500px at 85% 0%, rgba(225,6,0,0.16), transparent 60%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <svg
          width="560"
          height="560"
          viewBox="0 0 560 560"
          style={{ position: "absolute", right: 40, top: 35, opacity: 0.28 }}
        >
          <polyline
            points={track}
            fill="none"
            stroke="#F5F3F1"
            strokeWidth="7"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 90,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width="96" height="96" viewBox="0 0 64 64">
              <path
                d="M 16 58 L 16 36 Q 16 16 36 16 L 58 16"
                fill="none"
                stroke="#E10600"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <circle cx="37" cy="37" r="7" fill="#F5F3F1" />
            </svg>
            <div
              style={{
                fontSize: 110,
                fontWeight: 700,
                color: "#F5F3F1",
                letterSpacing: 18,
              }}
            >
              APEX
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 30,
              color: "rgba(245,243,241,0.6)",
              letterSpacing: 2,
            }}
          >
            The 2026 Formula 1 season — real data, replayed.
          </div>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              gap: 14,
              fontSize: 20,
              color: "rgba(245,243,241,0.45)",
              letterSpacing: 3,
            }}
          >
            <div style={{ display: "flex" }}>TELEMETRY</div>
            <div style={{ display: "flex", color: "#E10600" }}>·</div>
            <div style={{ display: "flex" }}>STANDINGS</div>
            <div style={{ display: "flex", color: "#E10600" }}>·</div>
            <div style={{ display: "flex" }}>TEAM RADIO</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
