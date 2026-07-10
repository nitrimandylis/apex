// The APEX mark: a racing line sweeping through a corner, with the apex
// point marked on the inside — drawn, not imported.
export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ filter: "drop-shadow(0 0 10px rgba(225,6,0,0.55))" }}
    >
      <defs>
        <linearGradient id="apex-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#B50500" />
          <stop offset="1" stop-color="#FF2A1F" />
        </linearGradient>
      </defs>
      {/* racing line: in from the bottom, clip the corner, out to the right */}
      <path
        d="M 16 58 L 16 36 Q 16 16 36 16 L 58 16"
        fill="none"
        stroke="url(#apex-line)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* the apex */}
      <circle cx="37" cy="37" r="7" fill="#F5F3F1" />
    </svg>
  );
}
