import { NextResponse } from "next/server";
import { WATCHED_PAIRS } from "@/lib/config";

// OANDA v20 REST API — practice (demo) environment. Never the live-trading host;
// this app is decision-support only and never places orders (see ForexMind ground rules).
const OANDA_PRACTICE_HOST = "https://api-fxpractice.oanda.com";

export async function GET() {
  const apiKey = process.env.OANDA_API_KEY;
  const accountId = process.env.OANDA_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "OANDA_API_KEY / OANDA_ACCOUNT_ID not set. Add a practice-account key to .env.local to go live — see .env.local.example.",
      },
      { status: 200 }
    );
  }

  const instruments = WATCHED_PAIRS.join(",");
  const url = `${OANDA_PRACTICE_HOST}/v3/accounts/${accountId}/pricing?instruments=${instruments}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { configured: true, error: `OANDA returned ${res.status}`, detail: body },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), prices: data.prices });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Unknown fetch error" },
      { status: 502 }
    );
  }
}
