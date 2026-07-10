"use client";

import { useEffect, useState } from "react";

export default function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  // Rendered after mount so the server and browser never disagree on the date.
  const [today, setToday] = useState("");
  useEffect(() => {
    // Deliberate one-time sync set: the date must only render client-side
    // so the server and browser never disagree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }, []);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 lg:mb-[30px]">
      <div className="text-[26px] font-semibold tracking-[0.01em]">{title}</div>
      <div className="flex-1" />
      {children}
      <div className="text-[13px] text-[#F5F3F1]/50">
        {today}
        {sub ? ` · ${sub}` : ""}
      </div>
    </div>
  );
}
