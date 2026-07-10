// The next race weekend's sessions as a chip strip. The next session still
// to come is highlighted red, past ones dim.
export default function ScheduleStrip({
  sessions,
  now,
}: {
  sessions: { label: string; start: string }[];
  now: number;
}) {
  const nextIdx = sessions.findIndex((s) => new Date(s.start).getTime() > now);

  return (
    <div className="flex flex-wrap gap-3">
      {sessions.map((s, i) => {
        const isNext = i === nextIdx;
        const isPast = nextIdx === -1 || i < nextIdx;
        const d = new Date(s.start);
        return (
          <div
            key={s.label}
            className="min-w-[104px] flex-1 rounded-[14px] border px-4 py-3"
            style={{
              background: isNext ? "rgba(225,6,0,0.10)" : "rgba(255,255,255,0.035)",
              borderColor: isNext ? "rgba(225,6,0,0.35)" : "rgba(255,255,255,0.07)",
              opacity: isPast ? 0.5 : 1,
            }}
          >
            <div
              className="text-[11px] tracking-[0.16em]"
              style={{
                color: isNext ? "rgba(255,86,78,0.8)" : "rgba(245,243,241,0.45)",
              }}
            >
              {s.label}
            </div>
            <div
              className="mt-[5px] text-sm font-semibold"
              style={isNext ? { color: "#FF564E" } : undefined}
            >
              {d.toLocaleDateString("en-GB", { weekday: "short" })} ·{" "}
              {d.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
