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
      {/* racing line: in from the bottom, clip the corner, out to the right.
          Solid red on purpose — a gradient def would need a unique id per
          instance (this renders twice, once inside a display:none top bar,
          and browsers resolve url(#id) to the first, unpaintable one). */}
      <path
        d="M 16 58 L 16 36 Q 16 16 36 16 L 58 16"
        fill="none"
        stroke="#E10600"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* the apex */}
      <circle cx="37" cy="37" r="7" fill="#F5F3F1" />
    </svg>
  );
}
