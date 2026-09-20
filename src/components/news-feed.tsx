"use client";

import { usePolling } from "@/hooks/use-polling";
import { ModuleCard } from "@/components/module-card";

type NewsItem = { id: string; headline: string; source: string; url: string; datetime: number };
type ApiResponse = { configured: true; error: string } | { configured: true; fetchedAt: string; items: NewsItem[] };

const POLL_MS = 5 * 60 * 1000; // news doesn't need second-by-second polling like prices
const TOP_N = 5;

function timeAgo(unixSeconds: number) {
  const minutes = Math.max(0, Math.round((Date.now() - unixSeconds * 1000) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function fetchNews(): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/news", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "Network error reaching /api/news" };
  }
}

export function NewsFeed() {
  const { data: state, refresh, refreshing } = usePolling(fetchNews, POLL_MS);
  const lastUpdated = state && "fetchedAt" in state ? state.fetchedAt : null;

  let body: React.ReactNode;
  if (!state) {
    body = <p className="text-[var(--color-muted)]">Loading headlines...</p>;
  } else if ("error" in state) {
    body = <p className="text-[var(--color-danger)]">News feed error: {state.error}</p>;
  } else if (state.items.length === 0) {
    body = <p className="text-[var(--color-muted)]">No recent headlines from any source right now.</p>;
  } else {
    body = (
      <ul className="flex flex-col gap-2">
        {state.items.slice(0, TOP_N).map((item) => (
          <li key={item.id} className="border-b border-[var(--color-border)] pb-2 last:border-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
            >
              {item.headline}
            </a>
            <div className="mt-0.5 text-xs text-[var(--color-muted)]">
              {item.source} · {timeAgo(item.datetime)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ModuleCard title="Market News — Top 5" status="live" lastUpdated={lastUpdated} onRefresh={refresh} refreshing={refreshing}>
      {body}
    </ModuleCard>
  );
}
