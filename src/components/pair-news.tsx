"use client";

import { usePolling } from "@/hooks/use-polling";
import { ModuleCard } from "@/components/module-card";

type Headline = { id: number; headline: string; source: string; url: string };
type PairGroup = { pair: string; headlines: Headline[] };
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string }
  | { configured: true; fetchedAt: string; groups: PairGroup[] };

const POLL_MS = 5 * 60 * 1000;

async function fetchPairNews(): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/pair-news", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error reaching /api/pair-news" };
  }
}

export function PairNews() {
  const { data: state, refresh, refreshing } = usePolling(fetchPairNews, POLL_MS);
  const lastUpdated = state && "fetchedAt" in state ? state.fetchedAt : null;

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-[var(--color-muted)]">Loading...</p>;
  } else if (!state.configured) {
    body = <p className="text-[var(--color-muted)]">{state.message}</p>;
  } else if ("error" in state) {
    body = <p className="text-[var(--color-danger)]">Pair news error: {state.error}</p>;
  } else {
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {state.groups.map((group) => (
          <div key={group.pair} className="border-l-2 border-[var(--color-border)] pl-2">
            <div className="mb-1 text-xs uppercase tracking-wider text-[var(--color-accent)]">{group.pair}</div>
            {group.headlines.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">No recent headlines mentioning this pair.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {group.headlines.map((h) => (
                  <li key={h.id}>
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                    >
                      {h.headline}
                    </a>
                    <span className="ml-1 text-[10px] text-[var(--color-muted)]">({h.source})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ModuleCard title="Watched Pairs News" status="live" lastUpdated={lastUpdated} onRefresh={refresh} refreshing={refreshing}>
      {body}
    </ModuleCard>
  );
}
