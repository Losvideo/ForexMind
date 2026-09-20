import { NextResponse } from "next/server";
import { fetchLivePrices, fetchCandles } from "@/lib/oanda";
import { fetchAllNews } from "@/lib/news-sources";
import { detectCurrencies } from "@/lib/currency-tags";
import { generateJSON } from "@/lib/gemini";
import { BEST_PLAYS_SYSTEM_PROMPT } from "@/lib/digest";
import { computeTechnicals } from "@/lib/technicals";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";
import { gradePendingRecommendations, getTrackRecordSummary, logRecommendationIfNew } from "@/lib/best-plays-log";
import { getCachedOrNull, setCache } from "@/lib/analyst-cache";

const MODULE = "best_plays";
const CACHE_MINUTES = 10;

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

  // Grading costs nothing (no Gemini call) — keep it fresh on every view, independent of
  // whether the recommendations themselves are served from cache below.
  if (process.env.DATABASE_URL) {
    await gradePendingRecommendations().catch(() => null);
  }

  // No way to bypass this from the client — "on demand" still can't call Gemini more than
  // once per window, whether the trigger is a page load or a mashed refresh button.
  if (process.env.DATABASE_URL) {
    const cached = await getCachedOrNull<{ generatedAt: string; recommendations: Recommendation[] }>(
      MODULE,
      CACHE_MINUTES
    ).catch(() => null);
    if (cached) return NextResponse.json({ configured: true, cached: true, ...cached });
  }

  const [prices, candlesByPair, newsItems, trackRecord] = await Promise.all([
    fetchLivePrices(),
    Promise.all(WATCHED_PAIRS.map((pair) => fetchCandles(pair, "H1", 60))),
    fetchAllNews(15),
    process.env.DATABASE_URL ? getTrackRecordSummary().catch(() => null) : Promise.resolve(null),
  ]);

  const priceByInstrument = new Map(
    prices.ok ? prices.prices.map((p) => [p.instrument, p]) : []
  );

  const taggedNews = newsItems.map((item) => ({ ...item, currencies: detectCurrencies(item.headline) }));

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
    const result = await generateJSON<{ recommendations: Recommendation[] }>(MODULE, BEST_PLAYS_SYSTEM_PROMPT, userPrompt);

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
