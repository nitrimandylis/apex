// Route-transition skeleton: glass blocks in the shape of a typical page,
// so navigation acknowledges the click while data loads server-side.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-[30px] flex items-center">
        <div className="h-8 w-56 rounded-lg bg-white/[0.05]" />
        <div className="flex-1" />
        <div className="h-4 w-40 rounded bg-white/[0.04]" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="h-[220px] rounded-[22px] border border-white/[0.06] bg-white/[0.025]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-[200px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
          <div className="h-[200px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
          <div className="h-[200px] rounded-[20px] border border-white/[0.06] bg-white/[0.02]" />
        </div>
      </div>
    </div>
  );
}
