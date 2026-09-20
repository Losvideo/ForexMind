import { WATCHED_PAIRS } from "@/lib/config";

const OANDA_PRACTICE_HOST = "https://api-fxpractice.oanda.com";

export type OandaPrice = { instrument: string; bids: { price: string }[]; asks: { price: string }[] };

export async function fetchLivePrices(): Promise<
  { ok: true; prices: OandaPrice[] } | { ok: false; error: string }
> {
  const apiKey = process.env.OANDA_API_KEY;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  if (!apiKey || !accountId) return { ok: false, error: "OANDA not configured" };

  const instruments = WATCHED_PAIRS.join(",");
  const url = `${OANDA_PRACTICE_HOST}/v3/accounts/${accountId}/pricing?instruments=${instruments}`;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `OANDA returned ${res.status}` };
    const data = await res.json();
    return { ok: true, prices: data.prices };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown fetch error" };
  }
}

export type Candle = { time: number; open: number; high: number; low: number; close: number };

// Granularity codes are OANDA's own (H1 = 1-hour, H4 = 4-hour, D = daily).
export async function fetchCandles(
  instrument: string,
  granularity: "H1" | "H4" | "D" = "H1",
  count = 150
): Promise<{ ok: true; candles: Candle[] } | { ok: false; error: string }> {
  const apiKey = process.env.OANDA_API_KEY;
  if (!apiKey) return { ok: false, error: "OANDA not configured" };

  const url = `${OANDA_PRACTICE_HOST}/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `OANDA returned ${res.status}` };
    const data = await res.json();
    const candles: Candle[] = data.candles
      .filter((c: { complete: boolean }) => c.complete)
      .map((c: { time: string; mid: { o: string; h: string; l: string; c: string } }) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
      }));
    return { ok: true, candles };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown fetch error" };
  }
}
