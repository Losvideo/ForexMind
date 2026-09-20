import { NextResponse } from "next/server";
import { fetchForexNews } from "@/lib/finnhub";
import { detectCurrencies } from "@/lib/currency-tags";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";

const HEADLINES_PER_PAIR = 2;

export async function GET() {
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "FINNHUB_API_KEY not set. Add a free-tier key to .env.local — see .env.local.example.",
    });
  }

  const news = await fetchForexNews(20);
  if (!news.ok) {
    return NextResponse.json({ configured: true, error: news.error }, { status: 502 });
  }

  const tagged = news.items.map((item) => ({ ...item, currencies: detectCurrencies(item.headline) }));

  const groups = WATCHED_PAIRS.map((pair) => {
    const [base, quote] = pair.split("_");
    const matches = tagged
      .filter((item) => item.currencies.includes(base) || item.currencies.includes(quote))
      .slice(0, HEADLINES_PER_PAIR)
      .map(({ id, headline, source, url, datetime }) => ({ id, headline, source, url, datetime }));
    return { pair: displayPair(pair), headlines: matches };
  });

  return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), groups });
}
