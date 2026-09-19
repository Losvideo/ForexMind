// Default watchlist per the ForexMind Build Roadmap — proposed by the original brainstorm,
// still an open confirmation question for Carlos. Change here once confirmed.
export const WATCHED_PAIRS = ["EUR_USD", "GBP_USD", "USD_JPY", "USD_CHF", "AUD_USD"] as const;

export type WatchedPair = (typeof WATCHED_PAIRS)[number];

export function displayPair(pair: string) {
  return pair.replace("_", "/");
}
