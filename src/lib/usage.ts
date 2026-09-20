import "server-only";
import { getDb } from "@/lib/db";

// gemini-3.1-flash-lite pricing as verified 2026-09-19 against Google's own pricing page —
// re-verify before trusting this long-term, this catalog churns fast.
const INPUT_PER_M = 0.25;
const OUTPUT_PER_M = 1.5;

export function estimateCost(promptTokens: number, outputTokens: number) {
  return (promptTokens / 1_000_000) * INPUT_PER_M + (outputTokens / 1_000_000) * OUTPUT_PER_M;
}

export async function getUsageStats(days = 30) {
  const sql = getDb();
  const rows = (await sql`
    SELECT module,
           COUNT(*) AS calls,
           SUM(prompt_tokens) AS prompt_tokens,
           SUM(output_tokens) AS output_tokens
    FROM gemini_usage_log
    WHERE called_at > now() - (${days} || ' days')::interval
    GROUP BY module
    ORDER BY module
  `) as { module: string; calls: string; prompt_tokens: string; output_tokens: string }[];

  const byModule = rows.map((r) => ({
    module: r.module,
    calls: Number(r.calls),
    promptTokens: Number(r.prompt_tokens),
    outputTokens: Number(r.output_tokens),
    estCost: estimateCost(Number(r.prompt_tokens), Number(r.output_tokens)),
  }));

  const totalCost = byModule.reduce((sum, m) => sum + m.estCost, 0);
  return { byModule, totalCost, days };
}
