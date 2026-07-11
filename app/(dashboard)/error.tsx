"use client";

// Dashboard error boundary: the data APIs occasionally rate-limit; give
// the user a real message and a way back instead of a crash screen.
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-10 py-[70px] text-center backdrop-blur-[18px]">
      <div className="text-2xl font-semibold">Couldn&apos;t load this page</div>
      <div className="max-w-[420px] text-[14.5px] leading-relaxed text-[#F5F3F1]/55">
        The data services (Jolpica / OpenF1) may be rate-limiting right now.
        It usually clears in a few seconds.
      </div>
      <button
        onClick={reset}
        className="mt-5 cursor-pointer rounded-full px-7 py-3 text-sm font-semibold tracking-[0.04em]"
        style={{
          background: "linear-gradient(135deg, #E10600, #A80400)",
          boxShadow: "0 10px 30px rgba(225,6,0,0.35)",
        }}
      >
        Try again
      </button>
    </div>
  );
}
