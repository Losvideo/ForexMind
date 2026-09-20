import Link from "next/link";
import { getSummaryStats } from "@/lib/best-plays-log";
import { ModuleCard } from "@/components/module-card";

export async function AccuracyTrackerSummary() {
  if (!process.env.DATABASE_URL) {
    return (
      <ModuleCard title="Accuracy Tracker" status="soon">
        <p className="text-[var(--color-muted)]">Database not configured yet.</p>
      </ModuleCard>
    );
  }

  const stats = await getSummaryStats();
  const graded = Number(stats.wins) + Number(stats.losses);
  const winRate = graded > 0 ? Math.round((Number(stats.wins) / graded) * 100) : null;

  return (
    <ModuleCard title="Accuracy Tracker" status="live">
      <div className="flex flex-col gap-2">
        {graded === 0 ? (
          <p className="text-[var(--color-muted)]">
            No graded recommendations yet — Best Plays logs every call, and this fills in as they resolve.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
            <span>Graded: {graded}</span>
            <span className="text-[var(--color-accent)]">Wins: {stats.wins}</span>
            <span className="text-[var(--color-danger)]">Losses: {stats.losses}</span>
            {winRate !== null && <span className="text-[var(--color-foreground)]">Win rate: {winRate}%</span>}
            {stats.avg_r && <span>Avg R: {Number(stats.avg_r).toFixed(2)}</span>}
          </div>
        )}
        <Link href="/history" className="self-start text-xs uppercase tracking-wider text-[var(--color-accent)] hover:underline">
          View full history →
        </Link>
      </div>
    </ModuleCard>
  );
}
