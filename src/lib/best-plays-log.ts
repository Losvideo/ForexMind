import "server-only";
import { getDb } from "@/lib/db";
import { fetchCandlesRange } from "@/lib/oanda";

export type LoggedRecommendation = {
  pair: string;
  direction: "long" | "short";
  setup: string;
  thesis: string;
  entry: number;
  stop: number;
  stopReason: string;
  takeProfit1: number;
  takeProfit2: number;
  plannedRR: number | null;
  confidencePct: number | null;
  invalidation: string;
};

const DEDUPE_WINDOW_HOURS = 20; // don't re-log the same still-live idea every 10-min poll
const GRADING_MIN_AGE_HOURS = 48; // "a couple of days" before we consider an untriggered idea expired

// Logs a new recommendation unless a pending one for the same pair was already logged recently
// (Best Plays regenerates its read every 10 minutes; without this the log would fill with
// near-duplicates of the same still-live idea instead of one row per genuinely new call).
export async function logRecommendationIfNew(rec: LoggedRecommendation) {
  const sql = getDb();
  const existing = (await sql`
    SELECT id FROM best_plays_log
    WHERE pair = ${rec.pair}
      AND status = 'pending'
      AND generated_at > now() - (${DEDUPE_WINDOW_HOURS} || ' hours')::interval
    LIMIT 1
  `) as { id: number }[];
  if (existing.length > 0) return { logged: false };

  await sql`
    INSERT INTO best_plays_log
      (pair, direction, setup, thesis, entry, stop, stop_reason, take_profit_1, take_profit_2, planned_rr, confidence_pct, invalidation)
    VALUES
      (${rec.pair}, ${rec.direction}, ${rec.setup}, ${rec.thesis}, ${rec.entry}, ${rec.stop}, ${rec.stopReason},
       ${rec.takeProfit1}, ${rec.takeProfit2}, ${rec.plannedRR}, ${rec.confidencePct}, ${rec.invalidation})
  `;
  return { logged: true };
}

type PendingRow = {
  id: number;
  pair: string;
  direction: "long" | "short";
  entry: string;
  stop: string;
  take_profit_1: string;
  take_profit_2: string;
  planned_rr: string | null;
  generated_at: string;
};

// Grades every pending row it can resolve from real candle history. Deliberately does not force
// a verdict on a trade that's genuinely still in play — it stays "pending" until the market
// actually resolves it (hits a target/stop) or the untriggered-expiry window passes.
export async function gradePendingRecommendations() {
  const sql = getDb();
  const pending = (await sql`SELECT * FROM best_plays_log WHERE status = 'pending'`) as PendingRow[];

  let gradedCount = 0;

  for (const row of pending) {
    const generatedAt = new Date(row.generated_at);
    const ageHours = (Date.now() - generatedAt.getTime()) / 3600000;
    const entry = parseFloat(row.entry);
    const stop = parseFloat(row.stop);
    const tp1 = parseFloat(row.take_profit_1);
    const isLong = row.direction === "long";

    const candlesResult = await fetchCandlesRange(row.pair, generatedAt.toISOString(), new Date().toISOString());
    if (!candlesResult.ok || candlesResult.candles.length === 0) continue;

    const candles = candlesResult.candles;

    // Find the first candle where price traded through the entry level.
    const triggerIndex = candles.findIndex((c) =>
      isLong ? c.low <= entry && c.high >= entry : c.high >= entry && c.low <= entry
    );

    if (triggerIndex === -1) {
      if (ageHours >= GRADING_MIN_AGE_HOURS) {
        await sql`
          UPDATE best_plays_log
          SET status = 'graded', outcome = 'EXPIRED', result_r = 0, graded_at = now(),
              grading_notes = 'Entry never traded within the grading window.'
          WHERE id = ${row.id}
        `;
        gradedCount++;
      }
      continue;
    }

    // From the trigger candle onward, whichever of stop / TP1 is hit first resolves the trade.
    // Same-candle-hits-both resolves conservatively as a loss, per the vault's scoring rules.
    let outcome: "WIN" | "LOSS" | null = null;
    for (let i = triggerIndex; i < candles.length; i++) {
      const c = candles[i];
      const hitStop = isLong ? c.low <= stop : c.high >= stop;
      const hitTp1 = isLong ? c.high >= tp1 : c.low <= tp1;
      if (hitStop && hitTp1) {
        outcome = "LOSS";
        break;
      }
      if (hitStop) {
        outcome = "LOSS";
        break;
      }
      if (hitTp1) {
        outcome = "WIN";
        break;
      }
    }

    if (outcome) {
      const resultR = outcome === "WIN" ? parseFloat(row.planned_rr ?? "1") : -1;
      await sql`
        UPDATE best_plays_log
        SET status = 'graded', outcome = ${outcome}, result_r = ${resultR}, graded_at = now(),
            grading_notes = ${outcome === "WIN" ? "TP1 reached before stop." : "Stop hit before TP1."}
        WHERE id = ${row.id}
      `;
      gradedCount++;
    }
    // else: triggered but still genuinely unresolved — leave pending, check again next run.
  }

  return { checked: pending.length, graded: gradedCount };
}

export async function getTrackRecordSummary(): Promise<string> {
  const sql = getDb();
  const graded = (await sql`
    SELECT setup, outcome, result_r FROM best_plays_log
    WHERE status = 'graded' AND outcome IN ('WIN', 'LOSS')
  `) as { setup: string; outcome: string; result_r: string }[];

  if (graded.length < 5) {
    return `Track record: insufficient sample so far (n=${graded.length}) — no adjustments to make yet.`;
  }

  const wins = graded.filter((g) => g.outcome === "WIN").length;
  const winRate = Math.round((wins / graded.length) * 100);
  const avgR = graded.reduce((sum, g) => sum + parseFloat(g.result_r), 0) / graded.length;

  const bySetup = new Map<string, { n: number; wins: number }>();
  for (const g of graded) {
    const s = bySetup.get(g.setup) ?? { n: 0, wins: 0 };
    s.n++;
    if (g.outcome === "WIN") s.wins++;
    bySetup.set(g.setup, s);
  }

  const setupLines = [...bySetup.entries()]
    .filter(([, s]) => s.n >= 3) // per-setup breakdown only once there's a minimal sample for that setup
    .map(([setup, s]) => {
      const rate = Math.round((s.wins / s.n) * 100);
      const flag = rate < 40 ? " — underperforming, be more skeptical of this setup" : "";
      return `${setup}: ${s.wins}/${s.n} (${rate}%)${flag}`;
    });

  return [
    `Track record so far (n=${graded.length}): ${winRate}% win rate, avg ${avgR.toFixed(2)}R.`,
    setupLines.length > 0 ? `By setup: ${setupLines.join("; ")}.` : "",
    graded.length < 30 ? "Sample is still small (<30) — treat this as directional, not conclusive." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type CatalogRow = {
  id: number;
  pair: string;
  direction: string;
  setup: string;
  thesis: string;
  entry: string;
  stop: string;
  take_profit_1: string;
  take_profit_2: string;
  confidence_pct: number | null;
  generated_at: string;
  status: string;
  outcome: string | null;
  result_r: string | null;
  graded_at: string | null;
  grading_notes: string | null;
};

export async function getCatalog(limit = 100): Promise<CatalogRow[]> {
  const sql = getDb();
  return (await sql`
    SELECT * FROM best_plays_log ORDER BY generated_at DESC LIMIT ${limit}
  `) as CatalogRow[];
}

export async function getSummaryStats() {
  const sql = getDb();
  const rows = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE outcome = 'WIN') AS wins,
      COUNT(*) FILTER (WHERE outcome = 'LOSS') AS losses,
      COUNT(*) FILTER (WHERE outcome = 'EXPIRED') AS expired,
      AVG(result_r) FILTER (WHERE outcome IN ('WIN','LOSS')) AS avg_r
    FROM best_plays_log
  `) as { pending: string; wins: string; losses: string; expired: string; avg_r: string | null }[];
  return rows[0];
}
