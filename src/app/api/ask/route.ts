import { NextRequest, NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/oanda";
import { fetchForexNews } from "@/lib/finnhub";
import { detectCurrencies } from "@/lib/currency-tags";
import { generateText } from "@/lib/gemini";
import { ASK_ANALYST_SYSTEM_PROMPT } from "@/lib/digest";
import { displayPair } from "@/lib/config";

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "GEMINI_API_KEY not set. Add one from Google AI Studio to .env.local.",
    });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ configured: true, error: "No question provided" }, { status: 400 });
  }

  const [prices, news] = await Promise.all([fetchLivePrices(), fetchForexNews(15)]);

  const priceLines = prices.ok
    ? prices.prices.map((p) => `${displayPair(p.instrument)}: bid ${p.bids[0]?.price}, ask ${p.asks[0]?.price}`).join("\n")
    : "(price data unavailable)";

  const newsLines = news.ok
    ? news.items
        .map((n) => `- ${n.headline} (${n.source}, currencies: ${detectCurrencies(n.headline).join(",") || "none detected"})`)
        .join("\n")
    : "(news data unavailable)";

  const userPrompt = `Live prices:\n${priceLines}\n\nRecent forex headlines:\n${newsLines}\n\nOperator's question: ${question}`;

  try {
    const answer = await generateText(ASK_ANALYST_SYSTEM_PROMPT, userPrompt);
    return NextResponse.json({ configured: true, answeredAt: new Date().toISOString(), answer });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown Gemini error" },
      { status: 502 }
    );
  }
}
