"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared polling + manual-refresh logic for every dashboard module. `fetcher` is expected to
// catch its own errors and resolve to a tagged union (never throw) — same pattern every
// module's API route already returns ({ configured: false } | { error } | real data).
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number) {
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
    const id = setInterval(refresh, intervalMs);
    return () => {
      mounted.current = false;
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [refresh, intervalMs]);

  return { data, refresh, refreshing };
}
