"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/use-polling";
import { ModuleCard } from "@/components/module-card";

type PulseData = {
  status: "green" | "yellow" | "red";
  summary: string;
  risk_regime: string;
  usd_trend: string;
  notable_events: string[];
  generatedAt: string;
};
type ApiResponse = { configured: false; message: string } | { configured: true; error: string } | ({ configured: true } & PulseData);

// On demand only, per Carlos's 2026-09-20 cost call — no client-side timer. The 10-minute
// floor between real Gemini calls is enforced server-side (src/lib/analyst-cache.ts) so this
// stays safe even if the tab is left open or refresh is clicked repeatedly.
const POLL_MS = null;

const STATUS_COLOR: Record<PulseData["status"], string> = {
  green: "bg-[var(--color-accent)]",
  yellow: "bg-yellow-400",
  red: "bg-[var(--color-danger)]",
};

async function fetchPulse(): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/market-pulse", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function MarketPulse() {
  const { data: state, refresh, refreshing } = usePolling(fetchPulse, POLL_MS);

  // Same "adjust state during render" pattern as PriceTicker — track the last status we saw
  // in state (not a ref) so we can flag a real regime change without an effect.
  const [processed, setProcessed] = useState<ApiResponse | null>(null);
  const [prevStatus, setPrevStatus] = useState<PulseData["status"] | null>(null);
  const [changedFrom, setChangedFrom] = useState<PulseData["status"] | null>(null);

  if (state !== processed) {
    setProcessed(state);
    if (state && "status" in state) {
      if (prevStatus && prevStatus !== state.status) setChangedFrom(prevStatus);
      setPrevStatus(state.status);
    }
  }

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-[var(--color-muted)]">Reading the market...</p>;
  } else if (!state.configured) {
    body = <p className="text-[var(--color-muted)]">{state.message}</p>;
  } else if ("error" in state) {
    body = <p className="text-[var(--color-danger)]">Market Pulse error: {state.error}</p>;
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${STATUS_COLOR[state.status]}`} />
          <span className="uppercase tracking-wider text-[var(--color-foreground)]">{state.status}</span>
          {changedFrom && (
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              (changed from {changedFrom})
            </span>
          )}
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

  const lastUpdated = state && "generatedAt" in state ? state.generatedAt : null;

  return (
    <ModuleCard
      title="Market Pulse"
      status="live"
      className="xl:col-span-2"
      lastUpdated={lastUpdated}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {body}
    </ModuleCard>
  );
}
