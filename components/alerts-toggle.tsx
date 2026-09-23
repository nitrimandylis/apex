"use client";

import { useEffect, useState } from "react";
import {
  disableAlerts,
  enableAlerts,
  initialAlertsState,
  type AlertsState,
} from "@/lib/alerts";
import { useFavorite } from "@/lib/favorite";

// One switch for all alerts, next to the favorite picker. In Safari before
// install it explains how to get alerts instead of pretending to work.
export default function AlertsToggle({ className }: { className: string }) {
  const { favorite } = useFavorite();
  const [state, setState] = useState<AlertsState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Deliberate one-time sync read: navigator and localStorage only exist
    // in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(initialAlertsState());
  }, []);

  async function toggle() {
    if (state === "install") {
      alert("Add APEX to your Home Screen first: Share, then Add to Home Screen. Open it from there to turn on alerts.");
      return;
    }
    setBusy(true);
    try {
      if (state === "on") {
        await disableAlerts();
        setState("off");
      } else if (await enableAlerts(favorite)) {
        setState("on");
      } else {
        alert("Notifications are blocked for APEX. Allow them in Settings to get alerts.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not change alerts. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (state === null || state === "unsupported") {
    return null;
  }

  const on = state === "on";
  return (
    <button onClick={toggle} disabled={busy} className={className}>
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{
          background: on ? "#E10600" : "rgba(245,243,241,0.18)",
          boxShadow: on ? "0 0 10px rgba(225,6,0,0.8)" : "none",
        }}
      />
      {on ? "Alerts on" : "Alerts"}
    </button>
  );
}
