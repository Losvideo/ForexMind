import { NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/oanda";
import { fetchAllNews } from "@/lib/news-sources";
import { generateJSON } from "@/lib/gemini";
import { MARKET_PULSE_SYSTEM_PROMPT } from "@/lib/digest";
import { displayPair } from "@/lib/config";
import { getCachedOrNull, setCache } from "@/lib/analyst-cache";

const MODULE = "market_pulse";
const CACHE_MINUTES = 10;

type MarketPulseResult = {
  status: "green" | "yellow" | "red";
  summary: string;
  risk_regime: string;
  usd_trend: string;
  notable_events: string[];
};

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "GEMINI_API_KEY not set. Add one from Google AI Studio to .env.local — see .env.local.example.",
    });
  }

  // No way to bypass this from the client, on purpose — "on demand" still can't call Gemini
  // more than once per window, whether the trigger is a page load or a mashed refresh button.
  if (process.env.DATABASE_URL) {
    const cached = await getCachedOrNull<{ generatedAt: string } & MarketPulseResult>(MODULE, CACHE_MINUTES).catch(() => null);
    if (cached) return NextResponse.json({ configured: true, cached: true, ...cached });
  }

  const [prices, newsItems] = await Promise.all([fetchLivePrices(), fetchAllNews(8)]);

  const priceLines = prices.ok
    ? prices.prices
        .map((p) => `${displayPair(p.instrument)}: bid ${p.bids[0]?.price}, ask ${p.asks[0]?.price}`)
        .join("\n")
    : `(price data unavailable: ${prices.error})`;

  const newsLines =
    newsItems.length > 0
      ? newsItems.map((n) => `- ${n.headline} (${n.source})`).join("\n")
      : "(no news data available)";

  const userPrompt = `Live prices:\n${priceLines}\n\nRecent forex headlines:\n${newsLines}`;

  try {
    const result = await generateJSON<MarketPulseResult>(MODULE, MARKET_PULSE_SYSTEM_PROMPT, userPrompt);
    const payload = { generatedAt: new Date().toISOString(), ...result };
    if (process.env.DATABASE_URL) await setCache(MODULE, payload).catch(() => null);
    return NextResponse.json({ configured: true, cached: false, ...payload });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown Gemini error" },
      { status: 502 }
    );
  }
}
