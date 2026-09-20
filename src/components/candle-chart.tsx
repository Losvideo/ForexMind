"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";
import { ModuleCard } from "@/components/module-card";

type Candle = { time: number; open: number; high: number; low: number; close: number };
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string }
  | { configured: true; fetchedAt: string; candles: Candle[] };

const POLL_MS = 30000;

async function fetchCandlesFor(pair: string): Promise<ApiResponse> {
  try {
    const res = await fetch(`/api/candles?pair=${pair}`, { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error reaching /api/candles" };
  }
}

export function CandleChart() {
  const [selectedPair, setSelectedPair] = useState<string>(WATCHED_PAIRS[0]);
  const [state, setState] = useState<ApiResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualTick, setManualTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Fetch on pair change, on manual refresh, and on a 30s interval.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setRefreshing(true);
      const result = await fetchCandlesFor(selectedPair);
      if (!cancelled) setState(result);
      setRefreshing(false);
    }

    const immediate = setTimeout(poll, 0);
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [selectedPair, manualTick]);

  // Create the chart once.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#7fae8c" },
      grid: { vertLines: { color: "#123319" }, horzLines: { color: "#123319" } },
      width: containerRef.current.clientWidth,
      height: 300,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#164a24" },
      rightPriceScale: { borderColor: "#164a24" },
      crosshair: { vertLine: { color: "#17c34d" }, horzLine: { color: "#17c34d" } },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00ff66",
      downColor: "#ff4d4d",
      borderUpColor: "#00ff66",
      borderDownColor: "#ff4d4d",
      wickUpColor: "#00ff66",
      wickDownColor: "#ff4d4d",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Push new candle data into the chart whenever a fetch resolves.
  useEffect(() => {
    if (state && "candles" in state && seriesRef.current) {
      seriesRef.current.setData(
        state.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [state]);

  const lastUpdated = state && "fetchedAt" in state ? state.fetchedAt : null;
  let statusMessage: { tone: "muted" | "danger"; text: string } | null = null;
  if (state && !state.configured) {
    statusMessage = { tone: "muted", text: state.message };
  } else if (state && "error" in state) {
    statusMessage = { tone: "danger", text: `Candle feed error: ${state.error}` };
  }

  return (
    <ModuleCard
      title="Candle History"
      status="live"
      lastUpdated={lastUpdated}
      onRefresh={() => setManualTick((n) => n + 1)}
      refreshing={refreshing}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {WATCHED_PAIRS.map((pair) => (
            <button
              key={pair}
              type="button"
              onClick={() => setSelectedPair(pair)}
              className={`rounded border px-2 py-1 text-xs uppercase tracking-wider transition ${
                pair === selectedPair
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent-dim)]"
              }`}
            >
              {displayPair(pair)}
            </button>
          ))}
          <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--color-muted)]">1H candles</span>
        </div>

        {statusMessage && (
          <p className={`text-sm ${statusMessage.tone === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}`}>
            {statusMessage.text}
          </p>
        )}

        <div ref={containerRef} className={statusMessage ? "hidden" : ""} />
      </div>
    </ModuleCard>
  );
}
