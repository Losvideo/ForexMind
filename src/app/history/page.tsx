import Link from "next/link";
import { getCatalog, getSummaryStats } from "@/lib/best-plays-log";

export const dynamic = "force-dynamic";

const OUTCOME_COLOR: Record<string, string> = {
  WIN: "text-[var(--color-accent)]",
  LOSS: "text-[var(--color-danger)]",
  EXPIRED: "text-[var(--color-muted)]",
};

export default async function HistoryPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="p-6">
        <p className="text-[var(--color-muted)]">DATABASE_URL not configured — the accuracy tracker has nothing to show yet.</p>
      </main>
    );
  }

  const [rows, stats] = await Promise.all([getCatalog(200), getSummaryStats()]);
  const graded = Number(stats.wins) + Number(stats.losses);
  const winRate = graded > 0 ? Math.round((Number(stats.wins) / graded) * 100) : null;

  return (
    <main className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="glow text-xl tracking-widest text-[var(--color-accent)]">BEST PLAYS HISTORY</h1>
        <Link href="/" className="text-xs uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-accent)]">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 border border-[var(--color-border)] p-3 text-sm">
        <span>Graded: {graded}</span>
        <span className="text-[var(--color-accent)]">Wins: {stats.wins}</span>
        <span className="text-[var(--color-danger)]">Losses: {stats.losses}</span>
        <span className="text-[var(--color-muted)]">Expired: {stats.expired}</span>
        <span className="text-[var(--color-muted)]">Pending: {stats.pending}</span>
        {winRate !== null && <span>Win rate: {winRate}%</span>}
        {stats.avg_r && <span>Avg R: {Number(stats.avg_r).toFixed(2)}</span>}
        {graded < 5 && <span className="text-[var(--color-muted)]">(sample still too small to draw conclusions)</span>}
      </div>

      <div className="overflow-x-auto border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase tracking-wider">
              <th className="p-2">Date</th>
              <th className="p-2">Pair</th>
              <th className="p-2">Dir</th>
              <th className="p-2">Setup</th>
              <th className="p-2">Entry</th>
              <th className="p-2">Stop</th>
              <th className="p-2">TP1</th>
              <th className="p-2">Confidence</th>
              <th className="p-2">Status</th>
              <th className="p-2">Outcome</th>
              <th className="p-2">R</th>
              <th className="p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)]/50">
                <td className="p-2 text-[var(--color-muted)]">{new Date(r.generated_at).toLocaleString()}</td>
                <td className="p-2">{r.pair.replace("_", "/")}</td>
                <td className={r.direction === "long" ? "p-2 text-[var(--color-accent)]" : "p-2 text-[var(--color-danger)]"}>
                  {r.direction}
                </td>
                <td className="p-2">{r.setup}</td>
                <td className="p-2">{r.entry}</td>
                <td className="p-2">{r.stop}</td>
                <td className="p-2">{r.take_profit_1}</td>
                <td className="p-2">{r.confidence_pct ?? "—"}%</td>
                <td className="p-2 text-[var(--color-muted)]">{r.status}</td>
                <td className={`p-2 ${r.outcome ? OUTCOME_COLOR[r.outcome] : ""}`}>{r.outcome ?? "—"}</td>
                <td className="p-2">{r.result_r ?? "—"}</td>
                <td className="p-2 max-w-[240px] truncate text-[var(--color-muted)]" title={r.grading_notes ?? r.thesis}>
                  {r.grading_notes ?? r.thesis}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="p-4 text-center text-[var(--color-muted)]">
                  No recommendations logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
