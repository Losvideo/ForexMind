import { fetchForexNews } from "@/lib/finnhub";
import { fetchRssFeed, type NewsItem } from "@/lib/rss";

export type { NewsItem };

// Verified working 2026-09-20 — each of these is a genuine Tier 1/Tier 2 primary or wire
// source per the FX Analyst Vault's own Source Directory, not a random aggregator.
const RSS_SOURCES = [
  { url: "https://www.federalreserve.gov/feeds/press_all.xml", name: "Federal Reserve" },
  { url: "https://www.ecb.europa.eu/rss/press.html", name: "ECB" },
  { url: "https://www.bankofengland.co.uk/rss/news", name: "Bank of England" },
  { url: "https://www.investing.com/rss/news_25.rss", name: "Investing.com" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World" },
] as const;

// Combines Finnhub (forex-specific, with sentiment) with several free primary/wire sources for
// broader coverage and independent corroboration — the vault's own source-hygiene checklist
// asks for a second independent source on anything market-moving; one feed alone can't offer that.
export async function fetchAllNews(limitPerSource = 8): Promise<NewsItem[]> {
  const [finnhub, ...rssResults] = await Promise.all([
    fetchForexNews(limitPerSource),
    ...RSS_SOURCES.map((s) => fetchRssFeed(s.url, s.name, limitPerSource)),
  ]);

  const finnhubItems: NewsItem[] = finnhub.ok
    ? finnhub.items.map((i) => ({ id: String(i.id), headline: i.headline, source: i.source, url: i.url, datetime: i.datetime }))
    : [];

  const all = [...finnhubItems, ...rssResults.flat()];
  all.sort((a, b) => b.datetime - a.datetime);

  // De-dupe near-identical headlines across sources (wire stories often get re-syndicated).
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    const key = item.headline.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
