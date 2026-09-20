"use client";

import { useEffect, useState } from "react";

function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// `key={at}` at the call site forces a fresh mount whenever the timestamp changes, so the
// lazy useState initializer (impure, but only runs once per mount — the sanctioned exception)
// always starts from the right value without needing an effect to reset it mid-render.
function Ticker({ at }: { at: string }) {
  const target = new Date(at).getTime();
  const [label, setLabel] = useState(() => formatElapsed(Date.now() - target));

  useEffect(() => {
    const id = setInterval(() => setLabel(formatElapsed(Date.now() - target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
      Updated {label}
    </span>
  );
}

export function LastUpdated({ at }: { at: string | null | undefined }) {
  if (!at) return null;
  return <Ticker key={at} at={at} />;
}
