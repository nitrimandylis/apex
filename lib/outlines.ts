import outlines from "./track-outlines.json";

type Entry = { location: string; points: { x: number; y: number }[] };
const entries = outlines as Record<string, Entry>;

// Look an outline up by Jolpica locality ("Spa") or OpenF1 location
// ("Spa-Francorchamps") — the two APIs rarely agree on names exactly.
export function outlineFor(place: string): { x: number; y: number }[] | null {
  const wanted = place.toLowerCase();
  for (const [locality, entry] of Object.entries(entries)) {
    const a = locality.toLowerCase();
    const b = entry.location.toLowerCase();
    if (
      a === wanted ||
      b === wanted ||
      a.includes(wanted) ||
      wanted.includes(a) ||
      b.includes(wanted) ||
      wanted.includes(b)
    ) {
      return entry.points;
    }
  }
  return null;
}
