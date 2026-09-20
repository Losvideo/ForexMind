// Lightweight keyword tagging — no AI call needed for this. A headline is tagged with a
// currency if it mentions that currency's code, common name, or central bank.
const CURRENCY_KEYWORDS: Record<string, string[]> = {
  EUR: ["eur", "euro", "ecb", "eurozone"],
  USD: ["usd", "dollar", "fed ", "fomc", "federal reserve"],
  GBP: ["gbp", "pound", "sterling", "boe", "bank of england"],
  JPY: ["jpy", "yen", "boj", "bank of japan"],
  CHF: ["chf", "franc", "snb", "swiss"],
  AUD: ["aud", "aussie", "rba", "australian dollar"],
};

export function detectCurrencies(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [code, keywords] of Object.entries(CURRENCY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) found.push(code);
  }
  return found;
}
