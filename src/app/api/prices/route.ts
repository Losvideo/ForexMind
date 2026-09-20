import { NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/oanda";

export async function GET() {
  if (!process.env.OANDA_API_KEY || !process.env.OANDA_ACCOUNT_ID) {
    return NextResponse.json({
      configured: false,
      message:
        "OANDA_API_KEY / OANDA_ACCOUNT_ID not set. Add a practice-account key to .env.local to go live — see .env.local.example.",
    });
  }

  const result = await fetchLivePrices();
  if (!result.ok) {
    return NextResponse.json({ configured: true, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), prices: result.prices });
}
