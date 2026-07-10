// Team palette from the design prototype, keyed by Jolpica constructorId.
export const TEAM_COLORS: Record<string, string> = {
  mercedes: "#00D2BE",
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  red_bull: "#3671C6",
  alpine: "#0090FF",
  rb: "#6692FF",
  haas: "#B6BABD",
  williams: "#64C4FF",
  audi: "#F50537",
  aston_martin: "#229971",
  cadillac: "#C5A253",
  // Historic teams, for the history page.
  alfa: "#9B0000",
  benetton: "#00A550",
  brabham: "#00563F",
  "brabham-repco": "#00563F",
  brawn: "#CDFB00",
  brm: "#5A7247",
  "cooper-climax": "#0E2A4E",
  jordan: "#F9C909",
  "lotus-climax": "#005F42",
  "lotus-ford": "#005F42",
  team_lotus: "#005F42",
  maserati: "#C00000",
  "matra-ford": "#1D6FB8",
  tyrrell: "#00205B",
  vanwall: "#0B4F35",
};

// OpenF1 uses team names ("Red Bull Racing"), not constructor ids.
const TEAM_NAME_TO_ID: Record<string, string> = {
  Mercedes: "mercedes",
  Ferrari: "ferrari",
  McLaren: "mclaren",
  "Red Bull Racing": "red_bull",
  "Red Bull": "red_bull",
  Alpine: "alpine",
  "Racing Bulls": "rb",
  RB: "rb",
  Haas: "haas",
  "Haas F1 Team": "haas",
  Williams: "williams",
  Audi: "audi",
  "Aston Martin": "aston_martin",
  Cadillac: "cadillac",
};

export function colorForTeamName(teamName: string): string {
  const id = TEAM_NAME_TO_ID[teamName];
  return id ? TEAM_COLORS[id] : "#B6BABD";
}

export const TYRE_COLORS: Record<string, string> = {
  S: "#FF564E",
  M: "#FFD12E",
  H: "#F5F3F1",
  I: "#43B02A",
  W: "#0067AD",
};
