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
    <div className="mb-[30px] flex items-center gap-4">
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
