export type FinnhubNewsItem = { id: number; headline: string; source: string; url: string; datetime: number };

export async function fetchForexNews(
  limit = 12
): Promise<{ ok: true; items: FinnhubNewsItem[] } | { ok: false; error: string }> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "Finnhub not configured" };

  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=forex&token=${apiKey}`, {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Finnhub returned ${res.status}` };
    const data: FinnhubNewsItem[] = await res.json();
    const items = data.slice(0, limit).map(({ id, headline, source, url, datetime }) => ({
      id,
      headline,
      source,
      url,
      datetime,
    }));
    return { ok: true, items };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown fetch error" };
  }
}
