import { NextResponse } from "next/server";
import { fetchLivePrices, fetchCandles } from "@/lib/oanda";
import { fetchForexNews } from "@/lib/finnhub";
import { detectCurrencies } from "@/lib/currency-tags";
import { generateJSON } from "@/lib/gemini";
import { BEST_PLAYS_SYSTEM_PROMPT } from "@/lib/digest";
import { computeTechnicals } from "@/lib/technicals";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";
import { gradePendingRecommendations, getTrackRecordSummary, logRecommendationIfNew } from "@/lib/best-plays-log";

type Recommendation = {
  pair: string;
  direction: "long" | "short";
  setup: string;
  thesis: string;
  entry: string;
  stop: string;
  stop_reason: string;
  take_profit_1: string;
  take_profit_2: string;
  planned_rr: string;
  confidence_pct: number;
  invalidation: string;
};

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "GEMINI_API_KEY not set. Add one from Google AI Studio to .env.local — see .env.local.example.",
    });
  }
  if (!process.env.OANDA_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "OANDA_API_KEY not set — Best Plays needs live prices and candle history to work from.",
    });
  }

  // Piggyback grading onto this same 10-minute tick — no separate cron needed.
  if (process.env.DATABASE_URL) {
    await gradePendingRecommendations().catch(() => null);
  }

  const [prices, candlesByPair, news, trackRecord] = await Promise.all([
    fetchLivePrices(),
    Promise.all(WATCHED_PAIRS.map((pair) => fetchCandles(pair, "H1", 60))),
    fetchForexNews(20),
    process.env.DATABASE_URL ? getTrackRecordSummary().catch(() => null) : Promise.resolve(null),
  ]);

  const priceByInstrument = new Map(
    prices.ok ? prices.prices.map((p) => [p.instrument, p]) : []
  );

  const taggedNews = news.ok ? news.items.map((item) => ({ ...item, currencies: detectCurrencies(item.headline) })) : [];

  const pairBlocks = WATCHED_PAIRS.map((pair, i) => {
    const [base, quote] = pair.split("_");
    const priceData = priceByInstrument.get(pair);
    const candleResult = candlesByPair[i];
    const technicals = candleResult.ok ? computeTechnicals(candleResult.candles) : null;
    const relevantNews = taggedNews
      .filter((n) => n.currencies.includes(base) || n.currencies.includes(quote))
      .slice(0, 3)
      .map((n) => n.headline);

    const lines = [`## ${displayPair(pair)}`];
    lines.push(
      priceData
        ? `Live: bid ${priceData.bids[0]?.price}, ask ${priceData.asks[0]?.price}`
        : "Live price: unavailable"
    );
    lines.push(
      technicals
        ? `Technicals (1H): last close ${technicals.lastClose.toFixed(5)}, ATR(14) ${technicals.atr14.toFixed(5)}, 20-bar range ${technicals.recentLow.toFixed(5)}-${technicals.recentHigh.toFixed(5)}`
        : "Technicals: unavailable"
    );
    lines.push(relevantNews.length > 0 ? `Recent headlines: ${relevantNews.join(" | ")}` : "Recent headlines: none");
    return lines.join("\n");
  });

  const userPrompt = [trackRecord, pairBlocks.join("\n\n")].filter(Boolean).join("\n\n");

  try {
    const result = await generateJSON<{ recommendations: Recommendation[] }>(BEST_PLAYS_SYSTEM_PROMPT, userPrompt);

    if (process.env.DATABASE_URL) {
      for (const r of result.recommendations) {
        await logRecommendationIfNew({
          pair: r.pair.replace("/", "_"),
          direction: r.direction,
          setup: r.setup,
          thesis: r.thesis,
          entry: parseFloat(r.entry),
          stop: parseFloat(r.stop),
          stopReason: r.stop_reason,
          takeProfit1: parseFloat(r.take_profit_1),
          takeProfit2: parseFloat(r.take_profit_2),
          plannedRR: parseFloat(r.planned_rr) || null,
          confidencePct: r.confidence_pct ?? null,
          invalidation: r.invalidation,
        }).catch(() => null);
      }
    }

    return NextResponse.json({ configured: true, generatedAt: new Date().toISOString(), ...result });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown Gemini error" },
      { status: 502 }
    );
  }
}
