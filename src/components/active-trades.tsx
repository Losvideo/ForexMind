"use client";

import { useEffect, useState } from "react";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";
import { loadTrades, saveTrades, type OpenTrade } from "@/lib/trades-storage";
import { ModuleCard } from "@/components/module-card";

type Coaching = {
  trade_id: string;
  action: "hold" | "scale" | "close";
  urgency: "normal" | "high";
  updated_stop: string | null;
  reasoning: string;
};
type ApiResponse =
  | { configured: false; message: string }
  | { configured: true; error: string }
  | { configured: true; generatedAt: string; coaching: Coaching[] };

const POLL_MS = 5 * 60 * 1000;
const ACTION_COLOR: Record<Coaching["action"], string> = {
  hold: "text-[var(--color-accent)]",
  scale: "text-yellow-400",
  close: "text-[var(--color-danger)]",
};

function emptyForm() {
  return { pair: WATCHED_PAIRS[0] as string, direction: "long" as "long" | "short", entry: "", stop: "", takeProfit1: "", takeProfit2: "" };
}

export function ActiveTrades() {
  const [trades, setTrades] = useState<OpenTrade[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [coachingState, setCoachingState] = useState<ApiResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  // localStorage isn't available during SSR — load the real list once, client-side, after mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTrades(loadTrades());
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) saveTrades(trades);
  }, [trades, loaded]);

  // Fetch coaching whenever the trade list changes, and on a 5-minute interval — but never
  // call Gemini at all when there are no open trades (real cost saving, not just an optimization).
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;

    async function poll() {
      if (trades.length === 0) {
        if (!cancelled) setCoachingState({ configured: true, generatedAt: new Date().toISOString(), coaching: [] });
        return;
      }
      setRefreshing(true);
      try {
        const res = await fetch("/api/position-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trades }),
        });
        const data: ApiResponse = await res.json();
        if (!cancelled) setCoachingState(data);
      } catch (err) {
        if (!cancelled) {
          setCoachingState({ configured: true, error: err instanceof Error ? err.message : "Network error" });
        }
      }
      setRefreshing(false);
    }

    const immediate = setTimeout(poll, 0);
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [loaded, trades]);

  // Fire a browser notification only on the transition into high urgency — tracked in state
  // (not a ref) so the comparison happens during the sanctioned "adjust state in render" pass.
  const [notifiedFor, setNotifiedFor] = useState<Record<string, boolean>>({});
  if (coachingState && "coaching" in coachingState) {
    const nextNotified = { ...notifiedFor };
    let changed = false;
    for (const c of coachingState.coaching) {
      const wasNotified = notifiedFor[c.trade_id] ?? false;
      if (c.urgency === "high" && !wasNotified) {
        nextNotified[c.trade_id] = true;
        changed = true;
        if (notifyEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const trade = trades.find((t) => t.id === c.trade_id);
          new Notification("ForexMind — high urgency", {
            body: trade ? `${displayPair(trade.pair)}: ${c.reasoning}` : c.reasoning,
          });
        }
      } else if (c.urgency !== "high" && wasNotified) {
        nextNotified[c.trade_id] = false;
        changed = true;
      }
    }
    if (changed) setNotifiedFor(nextNotified);
  }

  function addTrade(e: React.FormEvent) {
    e.preventDefault();
    const entry = parseFloat(form.entry);
    const stop = parseFloat(form.stop);
    const takeProfit1 = parseFloat(form.takeProfit1);
    const takeProfit2 = parseFloat(form.takeProfit2);
    if ([entry, stop, takeProfit1, takeProfit2].some((n) => Number.isNaN(n))) return;

    const trade: OpenTrade = {
      id: crypto.randomUUID(),
      pair: form.pair,
      direction: form.direction,
      entry,
      stop,
      takeProfit1,
      takeProfit2,
      openedAt: new Date().toISOString(),
    };
    setTrades((prev) => [...prev, trade]);
    setForm(emptyForm());
  }

  function removeTrade(id: string) {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

  async function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifyEnabled(permission === "granted");
  }

  const coachingById = new Map(
    coachingState && "coaching" in coachingState ? coachingState.coaching.map((c) => [c.trade_id, c]) : []
  );
  const lastUpdated = coachingState && "generatedAt" in coachingState ? coachingState.generatedAt : null;

  return (
    <ModuleCard title="My Active Trades" status="live" lastUpdated={lastUpdated} refreshing={refreshing}>
      <div className="flex flex-col gap-3">
        {!notifyEnabled && (
          <button
            type="button"
            onClick={requestNotifications}
            className="self-start rounded border border-[var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)] hover:border-[var(--color-accent-dim)]"
          >
            Enable high-urgency alerts
          </button>
        )}

        {trades.length === 0 ? (
          <p className="text-[var(--color-muted)]">No open trades logged. Add one below when you take a position.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {trades.map((t) => {
              const c = coachingById.get(t.id);
              return (
                <div
                  key={t.id}
                  className={`border p-2 text-xs ${c?.urgency === "high" ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-bold">
                      {displayPair(t.pair)} {t.direction.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      {c && <span className={`uppercase tracking-wider ${ACTION_COLOR[c.action]}`}>{c.action}</span>}
                      <button type="button" onClick={() => removeTrade(t.id)} className="text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="text-[var(--color-muted)]">
                    Entry {t.entry} · Stop {c?.updated_stop ?? t.stop} · TP1 {t.takeProfit1} · TP2 {t.takeProfit2}
                  </div>
                  {c && <p className="mt-1 text-[var(--color-foreground)]">{c.reasoning}</p>}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={addTrade} className="grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-2 sm:grid-cols-4">
          <select
            value={form.pair}
            onChange={(e) => setForm({ ...form, pair: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          >
            {WATCHED_PAIRS.map((p) => (
              <option key={p} value={p}>
                {displayPair(p)}
              </option>
            ))}
          </select>
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value as "long" | "short" })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <input
            required
            type="number"
            step="any"
            placeholder="Entry"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="Stop"
            value={form.stop}
            onChange={(e) => setForm({ ...form, stop: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="TP1"
            value={form.takeProfit1}
            onChange={(e) => setForm({ ...form, takeProfit1: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="TP2"
            value={form.takeProfit2}
            onChange={(e) => setForm({ ...form, takeProfit2: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)]"
          />
          <button
            type="submit"
            className="col-span-2 rounded border border-[var(--color-accent-dim)] px-2 py-1 text-xs uppercase tracking-wider text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]/10 sm:col-span-1"
          >
            Log trade
          </button>
        </form>
      </div>
    </ModuleCard>
  );
}
