import { NextResponse } from "next/server";
import { fetchAllNews } from "@/lib/news-sources";
import { detectCurrencies } from "@/lib/currency-tags";
import { WATCHED_PAIRS, displayPair } from "@/lib/config";

const HEADLINES_PER_PAIR = 2;

export async function GET() {
  const items = await fetchAllNews(15);
  const tagged = items.map((item) => ({ ...item, currencies: detectCurrencies(item.headline) }));

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
