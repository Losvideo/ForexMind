"use client";

import { useEffect, useRef, useState } from "react";
import { displayPair } from "@/lib/config";

type PriceRow = { instrument: string; bid: number; ask: number };
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string; detail?: string }
  | { configured: true; fetchedAt: string; prices: Array<{ instrument: string; bids: { price: string }[]; asks: { price: string }[] }> };

const POLL_MS = 5000;

export function PriceTicker() {
  const [state, setState] = useState<ApiResponse | null>(null);
  const previousMid = useRef<Record<string, number>>({});
  const [direction, setDirection] = useState<Record<string, "up" | "down" | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        const data: ApiResponse = await res.json();
        if (cancelled) return;

        if ("prices" in data) {
          const nextDirection: Record<string, "up" | "down" | null> = {};
          for (const p of data.prices) {
            const bid = parseFloat(p.bids[0]?.price ?? "0");
            const ask = parseFloat(p.asks[0]?.price ?? "0");
            const mid = (bid + ask) / 2;
            const prev = previousMid.current[p.instrument];
            nextDirection[p.instrument] = prev == null ? null : mid > prev ? "up" : mid < prev ? "down" : null;
            previousMid.current[p.instrument] = mid;
          }
          setDirection(nextDirection);
        }

        setState(data);
      } catch (err) {
        if (!cancelled) {
          setState({
            configured: true,
            error: err instanceof Error ? err.message : "Network error reaching /api/prices",
          });
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

  if (!state) {
    return <p className="text-sm text-[var(--color-muted)]">Loading live prices...</p>;
  }

  if (!state.configured) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Live prices not configured. {state.message}
      </p>
    );
  }

  if ("error" in state) {
    return (
      <p className="text-sm text-[var(--color-danger)]">
        Price feed error: {state.error}
      </p>
    );
  }

  const rows: PriceRow[] = state.prices.map((p) => ({
    instrument: p.instrument,
    bid: parseFloat(p.bids[0]?.price ?? "0"),
    ask: parseFloat(p.asks[0]?.price ?? "0"),
  }));

  return (
    <div className="flex flex-wrap gap-4 overflow-x-auto">
      {rows.map((row) => {
        const dir = direction[row.instrument];
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
