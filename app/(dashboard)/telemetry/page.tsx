import { Suspense } from "react";
import Replay from "@/components/replay";

export const metadata = { title: "Telemetry · APEX" };

// Suspense boundary: Replay reads useSearchParams (?session= deep links).
export default function TelemetryPage() {
  return (
    <Suspense>
      <Replay />
    </Suspense>
  );
}
