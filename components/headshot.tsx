"use client";

import { useState } from "react";

// Driver face hotlinked from F1's media CDN (via OpenF1). CDN links can
// rot, so a broken image falls back to an initial-letter circle.
export default function Headshot({
  src,
  name,
  color,
  size,
}: {
  src: string;
  name: string;
  color: string;
  size: number;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className="flex flex-none items-center justify-center rounded-full bg-white/[0.06] font-bold text-[#F5F3F1]/70"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.42,
          border: `1px solid ${color}`,
        }}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked CDN image, next/image would proxy it
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className="flex-none rounded-full bg-white/[0.06] object-cover object-top"
      style={{ width: size, height: size, border: `1px solid ${color}` }}
    />
  );
}
