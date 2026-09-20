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
