"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import TopNav from "@/components/top-nav";

type NextRaceCard = { round: number; name: string; detail: string };

const BACKGROUND =
  "radial-gradient(1100px 520px at 82% -8%, rgba(225,6,0,0.09), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(255,255,255,0.03), transparent 55%), #060608";

// The app frame. Users choose between a vertical sidebar and horizontal
// top tabs; the choice persists like the favorite driver does.
export default function Shell({
  nextRace,
  drivers,
  children,
}: {
  nextRace?: NextRaceCard;
  drivers: string[];
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<"side" | "top">("side");

  useEffect(() => {
    // Deliberate one-time sync read: the preference lives in localStorage,
    // which only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(localStorage.getItem("apex-nav") === "top" ? "top" : "side");
  }, []);

  function switchMode() {
    const next = mode === "side" ? "top" : "side";
    setMode(next);
    localStorage.setItem("apex-nav", next);
  }

  if (mode === "top") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: BACKGROUND }}
      >
        <TopNav nextRace={nextRace} drivers={drivers} onSwitch={switchMode} />
        <div className="flex-1">
          <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-[60px] lg:px-12 lg:pt-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ background: BACKGROUND }}
    >
      <Sidebar nextRace={nextRace} drivers={drivers} onSwitch={switchMode} />
      <div className="flex-1 lg:h-screen lg:overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-[60px] lg:px-12 lg:pt-[38px]">
          {children}
        </div>
      </div>
    </div>
  );
}
