import { Suspense } from "react";
import Replay from "@/components/replay";

// Suspense boundary: Replay reads useSearchParams (?session= deep links).
export default function TelemetryPage() {
  return (
    <Suspense>
      <Replay />
    </Suspense>
  );
}
