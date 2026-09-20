import { XMLParser } from "fast-xml-parser";

export type NewsItem = { id: string; headline: string; source: string; url: string; datetime: number };

const parser = new XMLParser({ ignoreAttributes: false });

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]);
  return "";
}

export async function fetchRssFeed(url: string, sourceName: string, limit = 10): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "ForexMindBot/1.0 (personal decision-support dashboard)" },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .slice(0, limit)
      .map((item: Record<string, unknown>): NewsItem | null => {
        const headline = textOf(item.title);
        const link = typeof item.link === "string" ? item.link : textOf((item.link as { "@_href"?: string })?.["@_href"] ?? item.link);
        const pubDate = textOf(item.pubDate) || textOf(item.published) || textOf(item.updated);
        if (!headline || !link) return null;
        const parsedDate = pubDate ? new Date(pubDate).getTime() : Date.now();
        return {
          id: link,
          headline,
          source: sourceName,
          url: link,
          datetime: Math.floor((Number.isNaN(parsedDate) ? Date.now() : parsedDate) / 1000),
        };
      })
      .filter((i): i is NewsItem => i !== null);
  } catch {
    return [];
  }
}
