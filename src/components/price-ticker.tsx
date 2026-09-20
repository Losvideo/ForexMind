"use client";

import { useState } from "react";
import { displayPair } from "@/lib/config";
import { usePolling } from "@/hooks/use-polling";
import { ModuleCard } from "@/components/module-card";

type PriceRow = { instrument: string; bid: number; ask: number };
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string; detail?: string }
  | { configured: true; fetchedAt: string; prices: Array<{ instrument: string; bids: { price: string }[]; asks: { price: string }[] }> };

type Direction = "up" | "down" | null;

const POLL_MS = 5000;

async function fetchPrices(): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/prices", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error reaching /api/prices" };
  }
}

export function PriceTicker() {
  const { data: state, refresh, refreshing } = usePolling(fetchPrices, POLL_MS);

  // React's documented "adjust state during render" pattern: compare this render's data to the
  // last one we actually processed (tracked in state, not a ref — refs can't be read/written
  // during render), and derive per-pair direction + remembered mids without an effect.
  const [processed, setProcessed] = useState<ApiResponse | null>(null);
  const [prevMids, setPrevMids] = useState<Record<string, number>>({});
  const [directions, setDirections] = useState<Record<string, Direction>>({});

  if (state !== processed) {
    setProcessed(state);
    if (state && "prices" in state) {
      const nextMids: Record<string, number> = {};
      const nextDirections: Record<string, Direction> = {};
      for (const p of state.prices) {
        const bid = parseFloat(p.bids[0]?.price ?? "0");
        const ask = parseFloat(p.asks[0]?.price ?? "0");
        const mid = (bid + ask) / 2;
        const prev = prevMids[p.instrument];
        nextDirections[p.instrument] = prev == null ? null : mid > prev ? "up" : mid < prev ? "down" : null;
        nextMids[p.instrument] = mid;
      }
      setPrevMids(nextMids);
      setDirections(nextDirections);
    }
  }

  const lastUpdated = state && "fetchedAt" in state ? state.fetchedAt : null;

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-sm text-[var(--color-muted)]">Loading live prices...</p>;
  } else if (!state.configured) {
    body = <p className="text-sm text-[var(--color-muted)]">Live prices not configured. {state.message}</p>;
  } else if ("error" in state) {
    body = <p className="text-sm text-[var(--color-danger)]">Price feed error: {state.error}</p>;
  } else {
    const rows: PriceRow[] = state.prices.map((p) => ({
      instrument: p.instrument,
      bid: parseFloat(p.bids[0]?.price ?? "0"),
      ask: parseFloat(p.asks[0]?.price ?? "0"),
    }));

    body = (
      <div className="flex flex-wrap gap-4 overflow-x-auto">
        {rows.map((row) => {
          const dir = directions[row.instrument];
          const color =
            dir === "up" ? "text-[var(--color-accent)]" : dir === "down" ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]";
          return (
            <div key={row.instrument} className="flex min-w-[7.5rem] flex-col rounded border border-[var(--color-border)] px-3 py-2">
              <span className="text-xs text-[var(--color-muted)]">{displayPair(row.instrument)}</span>
              <span className={`text-lg ${color}`}>{row.bid.toFixed(row.instrument.includes("JPY") ? 3 : 5)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ModuleCard title="Live Price Ticker" status="live" lastUpdated={lastUpdated} onRefresh={refresh} refreshing={refreshing}>
      {body}
    </ModuleCard>
  );
}
