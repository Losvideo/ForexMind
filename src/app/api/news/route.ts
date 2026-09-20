import { NextResponse } from "next/server";
import { fetchForexNews } from "@/lib/finnhub";

export async function GET() {
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "FINNHUB_API_KEY not set. Add a free-tier key to .env.local — see .env.local.example.",
    });
  }

  const result = await fetchForexNews();
  if (!result.ok) {
    return NextResponse.json({ configured: true, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), items: result.items });
}
