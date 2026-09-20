import { DashboardHeader } from "@/components/dashboard-header";
import { ModuleCard } from "@/components/module-card";
import { PriceTicker } from "@/components/price-ticker";
import { NewsFeed } from "@/components/news-feed";
import { WorldClocks } from "@/components/world-clocks";
import { MarketPulse } from "@/components/market-pulse";
import { PairNews } from "@/components/pair-news";
import { CandleChart } from "@/components/candle-chart";
import { BestPlays } from "@/components/best-plays";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <WorldClocks />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <PriceTicker />
        <CandleChart />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MarketPulse />

          <BestPlays />

          <ModuleCard title="My Active Trades" status="soon">
            <p className="text-[var(--color-muted)]">
              Log an open position and get HOLD / SCALE / CLOSE coaching — Phase 3.
            </p>
          </ModuleCard>

          <NewsFeed />

          <PairNews />

          <ModuleCard title="Ask the Analyst" status="soon">
            <p className="text-[var(--color-muted)]">
              Ask about a specific headline or move and get an on-demand, sourced answer — next up.
            </p>
          </ModuleCard>
        </div>
      </main>
    </div>
  );
}
