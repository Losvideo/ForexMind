import { DashboardHeader } from "@/components/dashboard-header";
import { ModuleCard } from "@/components/module-card";
import { PriceTicker } from "@/components/price-ticker";
import { NewsFeed } from "@/components/news-feed";
import { WorldClocks } from "@/components/world-clocks";
import { MarketPulse } from "@/components/market-pulse";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <WorldClocks />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <ModuleCard title="Live Price Ticker" status="live">
          <PriceTicker />
        </ModuleCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard title="Best Plays Right Now" status="soon" className="xl:col-span-2">
            <p className="text-[var(--color-muted)]">
              AI-identified setups land here in Phase 2 — pair, entry, targets, stop, and a plain-English thesis, refreshed every 10 minutes.
            </p>
          </ModuleCard>

          <ModuleCard title="Market Pulse" status="live">
            <MarketPulse />
          </ModuleCard>

          <ModuleCard title="My Active Trades" status="soon">
            <p className="text-[var(--color-muted)]">
              Log an open position and get HOLD / SCALE / CLOSE coaching — Phase 3.
            </p>
          </ModuleCard>

          <ModuleCard title="Market News" status="live">
            <NewsFeed />
          </ModuleCard>

          <ModuleCard title="Ask the Analyst" status="soon">
            <p className="text-[var(--color-muted)]">
              Ask about a specific headline or move and get an on-demand, sourced answer — Phase 2.
            </p>
          </ModuleCard>
        </div>
      </main>
    </div>
  );
}
