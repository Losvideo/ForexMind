"use client";

import { usePolling } from "@/hooks/use-polling";
import { ModuleCard } from "@/components/module-card";

type Recommendation = {
  pair: string;
  direction: "long" | "short";
  setup: string;
  thesis: string;
  entry: string;
  stop: string;
  stop_reason: string;
  take_profit_1: string;
  take_profit_2: string;
  planned_rr: string;
  confidence_pct: number;
  invalidation: string;
};

type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string }
  | { configured: true; generatedAt: string; recommendations: Recommendation[] };

// On demand only — see market-pulse.tsx for why this is safe without a client-side timer.
const POLL_MS = null;

async function fetchBestPlays(): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/best-plays", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error reaching /api/best-plays" };
  }
}

function RecommendationCard({ r }: { r: Recommendation }) {
  const dirColor = r.direction === "long" ? "text-[var(--color-accent)]" : "text-[var(--color-danger)]";
  return (
    <div className="border border-[var(--color-border)] p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold">
          {r.pair} <span className={dirColor}>{r.direction.toUpperCase()}</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">{r.setup}</span>
      </div>
      <p className="mb-2 text-xs text-[var(--color-foreground)]">{r.thesis}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] sm:grid-cols-4">
        <span>Entry: {r.entry}</span>
        <span>Stop: {r.stop}</span>
        <span>TP1: {r.take_profit_1}</span>
        <span>TP2: {r.take_profit_2}</span>
        <span>R:R: {r.planned_rr}</span>
        <span>Confidence: {r.confidence_pct}%</span>
      </div>
      <p className="mt-2 text-[10px] text-[var(--color-muted)]">
        Stop logic: {r.stop_reason} · Kills the idea: {r.invalidation}
      </p>
    </div>
  );
}

export function BestPlays() {
  const { data: state, refresh, refreshing } = usePolling(fetchBestPlays, POLL_MS);
  const lastUpdated = state && "generatedAt" in state ? state.generatedAt : null;

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-[var(--color-muted)]">Screening the watchlist...</p>;
  } else if (!state.configured) {
    body = <p className="text-[var(--color-muted)]">{state.message}</p>;
  } else if ("error" in state) {
    body = <p className="text-[var(--color-danger)]">Best Plays error: {state.error}</p>;
  } else if (state.recommendations.length === 0) {
    body = (
      <p className="text-[var(--color-muted)]">
        No trade right now — nothing on the watchlist clears the quality gate. That&rsquo;s a valid, often correct read.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        {state.recommendations.map((r, i) => (
          <RecommendationCard key={i} r={r} />
        ))}
      </div>
    );
  }

  return (
    <ModuleCard
      title="Best Plays Right Now"
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
