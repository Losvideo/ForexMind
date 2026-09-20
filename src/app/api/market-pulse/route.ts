import { NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/oanda";
import { fetchForexNews } from "@/lib/finnhub";
import { generateJSON } from "@/lib/gemini";
import { MARKET_PULSE_SYSTEM_PROMPT } from "@/lib/digest";
import { displayPair } from "@/lib/config";

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

  const [prices, news] = await Promise.all([fetchLivePrices(), fetchForexNews(8)]);

  const priceLines = prices.ok
    ? prices.prices
        .map((p) => `${displayPair(p.instrument)}: bid ${p.bids[0]?.price}, ask ${p.asks[0]?.price}`)
        .join("\n")
    : `(price data unavailable: ${prices.error})`;

  const newsLines = news.ok
    ? news.items.map((n) => `- ${n.headline} (${n.source})`).join("\n")
    : `(news data unavailable: ${news.error})`;

  const userPrompt = `Live prices:\n${priceLines}\n\nRecent forex headlines:\n${newsLines}`;

  try {
    const result = await generateJSON<MarketPulseResult>(MARKET_PULSE_SYSTEM_PROMPT, userPrompt);
    return NextResponse.json({ configured: true, generatedAt: new Date().toISOString(), ...result });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown Gemini error" },
      { status: 502 }
    );
  }
}
