import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/oanda";
import { WATCHED_PAIRS } from "@/lib/config";

export async function GET(request: NextRequest) {
  if (!process.env.OANDA_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "OANDA_API_KEY not set. Add a practice-account key to .env.local — see .env.local.example.",
    });
  }

  const pair = request.nextUrl.searchParams.get("pair") ?? "";
  if (!WATCHED_PAIRS.includes(pair as (typeof WATCHED_PAIRS)[number])) {
    return NextResponse.json({ configured: true, error: `Unknown pair: ${pair}` }, { status: 400 });
  }

  const result = await fetchCandles(pair, "H1", 150);
  if (!result.ok) {
    return NextResponse.json({ configured: true, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), candles: result.candles });
}
