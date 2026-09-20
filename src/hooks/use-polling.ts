"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared polling + manual-refresh logic for every dashboard module. `fetcher` is expected to
// catch its own errors and resolve to a tagged union (never throw) — same pattern every
// module's API route already returns ({ configured: false } | { error } | real data).
//
// `intervalMs: null` means "fetch once on mount, then only on manual refresh()" — no client-side
// timer at all. Used for the Gemini-backed modules, where the real cost guard is server-side
// (see src/lib/analyst-cache.ts): the client can call as often as it wants, but the server only
// ever calls Gemini once per cache window regardless of what triggered the request.
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number | null) {
  const [data, setData] = useState<T | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  const mounted = useRef(true);

  // Keep the ref current without mutating it during render — this runs as a post-render effect.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const result = await fetcherRef.current();
    if (mounted.current) setData(result);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Deferred via setTimeout/setInterval (external-timer callbacks), not called directly in
    // the effect body, so the first fetch fires almost immediately without a full interval wait.
    const immediate = setTimeout(refresh, 0);
    const id = intervalMs !== null ? setInterval(refresh, intervalMs) : null;
    return () => {
      mounted.current = false;
      clearTimeout(immediate);
      if (id !== null) clearInterval(id);
    };
  }, [refresh, intervalMs]);

  return { data, refresh, refreshing };
}
