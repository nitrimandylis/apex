// IANA timezone per circuit, keyed by Jolpica locality. Intl handles DST,
// so session times render correctly in circuit-local time year round.
const CIRCUIT_TZ: Record<string, string> = {
  Melbourne: "Australia/Melbourne",
  Shanghai: "Asia/Shanghai",
  Suzuka: "Asia/Tokyo",
  Miami: "America/New_York",
  Montreal: "America/Toronto",
  "Monte Carlo": "Europe/Monaco",
  "Monte-Carlo": "Europe/Monaco",
  Barcelona: "Europe/Madrid",
  Spielberg: "Europe/Vienna",
  Silverstone: "Europe/London",
  Spa: "Europe/Brussels",
  Budapest: "Europe/Budapest",
  Zandvoort: "Europe/Amsterdam",
  Monza: "Europe/Rome",
  Madrid: "Europe/Madrid",
  Baku: "Asia/Baku",
  "Marina Bay": "Asia/Singapore",
  Austin: "America/Chicago",
  "Mexico City": "America/Mexico_City",
  "São Paulo": "America/Sao_Paulo",
  "Sao Paulo": "America/Sao_Paulo",
  "Las Vegas": "America/Los_Angeles",
  Lusail: "Asia/Qatar",
  "Abu Dhabi": "Asia/Dubai",
  Sakhir: "Asia/Bahrain",
  Jeddah: "Asia/Riyadh",
};

export function circuitTz(locality: string): string {
  return CIRCUIT_TZ[locality] ?? "UTC";
}
