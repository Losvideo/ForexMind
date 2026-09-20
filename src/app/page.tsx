import { DashboardHeader } from "@/components/dashboard-header";
import { PriceTicker } from "@/components/price-ticker";
import { NewsFeed } from "@/components/news-feed";
import { WorldClocks } from "@/components/world-clocks";
import { MarketPulse } from "@/components/market-pulse";
import { PairNews } from "@/components/pair-news";
import { CandleChart } from "@/components/candle-chart";
import { BestPlays } from "@/components/best-plays";
import { ActiveTrades } from "@/components/active-trades";
import { AskAnalyst } from "@/components/ask-analyst";
import { AccuracyTrackerSummary } from "@/components/accuracy-tracker-summary";

export const dynamic = "force-dynamic";

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

          <AccuracyTrackerSummary />

          <ActiveTrades />

          <NewsFeed />

          <PairNews />

          <AskAnalyst />
        </div>
      </main>
    </div>
  );
}
