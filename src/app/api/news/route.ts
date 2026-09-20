import { NextResponse } from "next/server";
import { fetchAllNews } from "@/lib/news-sources";

export async function GET() {
  const items = await fetchAllNews();
  return NextResponse.json({ configured: true, fetchedAt: new Date().toISOString(), items });
}
