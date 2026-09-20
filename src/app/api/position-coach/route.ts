import { NextRequest, NextResponse } from "next/server";
import { fetchLivePrices, fetchCandles } from "@/lib/oanda";
import { generateJSON } from "@/lib/gemini";
import { POSITION_COACH_SYSTEM_PROMPT } from "@/lib/digest";
import { computeTechnicals } from "@/lib/technicals";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";

type TradeInput = {
  id: string;
  pair: string;
  direction: "long" | "short";
  entry: number;
  stop: number;
  takeProfit1: number;
  takeProfit2: number;
};

type Coaching = {
  trade_id: string;
  action: "hold" | "scale" | "close";
  urgency: "normal" | "high";
  updated_stop: string | null;
  reasoning: string;
};

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "GEMINI_API_KEY not set. Add one from Google AI Studio to .env.local.",
    });
  }

  const body = await request.json().catch(() => null);
  const trades: TradeInput[] = Array.isArray(body?.trades) ? body.trades : [];

  // Cost-saving: no open trades, no Gemini call at all.
  if (trades.length === 0) {
    return NextResponse.json({ configured: true, generatedAt: new Date().toISOString(), coaching: [] });
  }

  const validTrades = trades.filter((t) => WATCHED_PAIRS.includes(t.pair as (typeof WATCHED_PAIRS)[number]));
  if (validTrades.length === 0) {
    return NextResponse.json({ configured: true, error: "No valid watched-pair trades in request" }, { status: 400 });
  }

  const pairsNeeded = [...new Set(validTrades.map((t) => t.pair))];

  const [prices, candlesByPair] = await Promise.all([
    fetchLivePrices(),
    Promise.all(pairsNeeded.map((pair) => fetchCandles(pair, "H1", 30))),
  ]);

  const priceByInstrument = new Map(prices.ok ? prices.prices.map((p) => [p.instrument, p]) : []);
  const technicalsByPair = new Map(
    pairsNeeded.map((pair, i) => [pair, candlesByPair[i].ok ? computeTechnicals(candlesByPair[i].candles) : null])
  );

  const tradeBlocks = validTrades.map((t) => {
    const priceData = priceByInstrument.get(t.pair);
    const technicals = technicalsByPair.get(t.pair);
    const currentPrice = priceData ? (parseFloat(priceData.bids[0]?.price ?? "0") + parseFloat(priceData.asks[0]?.price ?? "0")) / 2 : null;

    const lines = [
      `## Trade ${t.id}`,
      `${displayPair(t.pair)} ${t.direction.toUpperCase()}`,
      `Entry: ${t.entry}, Stop: ${t.stop}, TP1: ${t.takeProfit1}, TP2: ${t.takeProfit2}`,
      currentPrice ? `Current price: ${currentPrice.toFixed(5)}` : "Current price: unavailable",
      technicals
        ? `Technicals (1H): ATR(14) ${technicals.atr14.toFixed(5)}, 20-bar range ${technicals.recentLow.toFixed(5)}-${technicals.recentHigh.toFixed(5)}`
        : "Technicals: unavailable",
    ];
    return lines.join("\n");
  });

  try {
    const result = await generateJSON<{ coaching: Coaching[] }>("position_coach", POSITION_COACH_SYSTEM_PROMPT, tradeBlocks.join("\n\n"));
    return NextResponse.json({ configured: true, generatedAt: new Date().toISOString(), ...result });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown Gemini error" },
      { status: 502 }
    );
  }
}
