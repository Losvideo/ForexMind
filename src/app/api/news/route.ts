import { NextResponse } from "next/server";

type FinnhubNewsItem = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
};

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      message: "FINNHUB_API_KEY not set. Add a free-tier key to .env.local — see .env.local.example.",
    });
  }

  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=forex&token=${apiKey}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { configured: true, error: `Finnhub returned ${res.status}` },
        { status: 502 }
      );
    }

    const data: FinnhubNewsItem[] = await res.json();
    // Only forward the fields the UI actually needs — never the raw HTML summary body.
    const items = data
      .slice(0, 12)
      .map(({ id, headline, source, url, datetime }) => ({ id, headline, source, url, datetime }));

    return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), items });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown fetch error" },
      { status: 502 }
    );
  }
}
