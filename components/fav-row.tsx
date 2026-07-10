"use client";

import { useFavorite } from "@/lib/favorite";
import { nameKey } from "@/lib/format";

// Wraps any driver row and highlights it when it matches the favorite
// driver. Server components render rows through this so the highlight
// stays client-side (the favorite lives in localStorage).
export default function FavRow({
  familyName,
  className = "",
  background,
  children,
}: {
  familyName: string;
  className?: string;
  background?: string; // the row's normal background (e.g. zebra stripe)
  children: React.ReactNode;
}) {
  const { favorite } = useFavorite();
  const isFav = favorite !== "" && nameKey(favorite) === nameKey(familyName);

  const style = isFav
    ? {
        background: "rgba(225,6,0,0.09)",
        boxShadow: "inset 0 0 0 1px rgba(225,6,0,0.4)",
      }
    : background
      ? { background }
      : undefined;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
