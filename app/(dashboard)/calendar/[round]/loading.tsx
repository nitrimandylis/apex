// Race pages fetch several sessions' worth of data on demand — this
// skeleton mirrors the report layout so the wait reads as progress.
export default function RaceDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-[30px] flex items-center">
        <div className="h-8 w-72 rounded-lg bg-white/[0.05]" />
        <div className="flex-1" />
        <div className="h-4 w-24 rounded bg-white/[0.04]" />
      </div>
      <div className="mb-6 h-4 w-80 rounded bg-white/[0.04]" />
      <div className="flex flex-col gap-5">
        <div className="h-[240px] rounded-[22px] border border-white/[0.06] bg-white/[0.025]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="h-[180px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
          <div className="h-[180px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
        </div>
        <div className="h-[420px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
      </div>
    </div>
  );
}
