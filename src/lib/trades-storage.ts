"use client";

// Trades live in this browser's localStorage only — no server database yet, deliberately.
// Honest limitation: they won't sync to another device or browser. If that ever matters,
// this is the file to replace with a Firestore-backed version.

export type OpenTrade = {
  id: string;
  pair: string;
  direction: "long" | "short";
  entry: number;
  stop: number;
  takeProfit1: number;
  takeProfit2: number;
  openedAt: string;
};

const STORAGE_KEY = "forexmind_open_trades";

export function loadTrades(): OpenTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OpenTrade[]) : [];
  } catch {
    return [];
  }
}

export function saveTrades(trades: OpenTrade[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch {
    // Private-browsing storage restrictions, quota, etc. — trades just won't persist this session.
  }
}
