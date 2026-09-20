"use client";

import { useEffect, useState } from "react";

type PulseData = {
  status: "green" | "yellow" | "red";
  summary: string;
  risk_regime: string;
  usd_trend: string;
  notable_events: string[];
  generatedAt: string;
};
type ApiResponse = { configured: false; message: string } | { configured: true; error: string } | ({ configured: true } & PulseData);

const POLL_MS = 10 * 60 * 1000; // matches the shared 10-minute cadence for Modules A/B

const STATUS_COLOR: Record<PulseData["status"], string> = {
  green: "bg-[var(--color-accent)]",
  yellow: "bg-yellow-400",
  red: "bg-[var(--color-danger)]",
};

export function MarketPulse() {
  const [state, setState] = useState<ApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/market-pulse", { cache: "no-store" });
        const data: ApiResponse = await res.json();
        if (!cancelled) setState(data);
      } catch (err) {
        if (!cancelled) {
          setState({ configured: true, error: err instanceof Error ? err.message : "Network error" });
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!state) return <p className="text-[var(--color-muted)]">Reading the market...</p>;
  if (!state.configured) return <p className="text-[var(--color-muted)]">{state.message}</p>;
  if ("error" in state) return <p className="text-[var(--color-danger)]">Market Pulse error: {state.error}</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${STATUS_COLOR[state.status]}`} />
        <span className="uppercase tracking-wider text-[var(--color-foreground)]">{state.status}</span>
      </div>
      <p className="text-[var(--color-foreground)]">{state.summary}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
        <span>Risk regime: {state.risk_regime}</span>
        <span>USD: {state.usd_trend}</span>
      </div>
      {state.notable_events.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-[var(--color-muted)]">
          {state.notable_events.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
