"use client";

import { useEffect, useState } from "react";

type NewsItem = { id: number; headline: string; source: string; url: string; datetime: number };
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string }
  | { configured: true; fetchedAt: string; items: NewsItem[] };

const POLL_MS = 5 * 60 * 1000; // news doesn't need second-by-second polling like prices

function timeAgo(unixSeconds: number) {
  const minutes = Math.max(0, Math.round((Date.now() - unixSeconds * 1000) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NewsFeed() {
  const [state, setState] = useState<ApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const data: ApiResponse = await res.json();
        if (!cancelled) setState(data);
      } catch (err) {
        if (!cancelled) {
          setState({
            configured: true,
            error: err instanceof Error ? err.message : "Network error reaching /api/news",
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

  if (!state) return <p className="text-[var(--color-muted)]">Loading headlines...</p>;
  if (!state.configured) return <p className="text-[var(--color-muted)]">{state.message}</p>;
  if ("error" in state) return <p className="text-[var(--color-danger)]">News feed error: {state.error}</p>;

  if (state.items.length === 0) {
    return <p className="text-[var(--color-muted)]">No recent forex headlines from Finnhub right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {state.items.map((item) => (
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
