import type { Candle } from "@/lib/oanda";

export type TechnicalSnapshot = {
  lastClose: number;
  atr14: number;
  recentHigh: number; // last 20 bars
  recentLow: number; // last 20 bars
};

// Wilder's ATR, standard 14-period. Candles are assumed oldest-first (OANDA returns them that way).
export function computeTechnicals(candles: Candle[]): TechnicalSnapshot | null {
  if (candles.length < 15) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trueRanges.push(tr);
  }

  const last14 = trueRanges.slice(-14);
  const atr14 = last14.reduce((sum, tr) => sum + tr, 0) / last14.length;

  const last20 = candles.slice(-20);
  const recentHigh = Math.max(...last20.map((c) => c.high));
  const recentLow = Math.min(...last20.map((c) => c.low));

  return {
    lastClose: candles[candles.length - 1].close,
    atr14,
    recentHigh,
    recentLow,
  };
}
