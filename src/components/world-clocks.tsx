"use client";

import { useEffect, useState } from "react";

const CLOCKS = [
  { label: "TAMPA", zone: "America/New_York" },
  { label: "LOS ANGELES", zone: "America/Los_Angeles" },
  { label: "LONDON", zone: "Europe/London" },
  { label: "TOKYO", zone: "Asia/Tokyo" },
  { label: "SYDNEY", zone: "Australia/Sydney" },
] as const;

function formatTime(now: Date, zone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

export function WorldClocks() {
  // Initial value differs between server and client render by design (it's a live clock) —
  // suppressHydrationWarning below is React's documented pattern for exactly this case.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap justify-center gap-3 border-b border-[var(--color-border)] bg-black/40 px-4 py-3 sm:justify-start sm:px-6">
      {CLOCKS.map(({ label, zone }) => (
        <div
          key={zone}
          className="flex min-w-[7.5rem] flex-col items-center rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5"
        >
          <span className="text-[10px] tracking-widest text-[var(--color-muted)]">{label}</span>
          <span
            className="glow font-bold tabular-nums tracking-[0.15em] text-[var(--color-accent)]"
            suppressHydrationWarning
          >
            {formatTime(now, zone)}
          </span>
        </div>
      ))}
    </div>
  );
}
