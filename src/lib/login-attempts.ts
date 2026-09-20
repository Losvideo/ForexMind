import "server-only";

// Best-effort, in-memory brute-force throttle. Honest limitation: this Map lives inside a
// single serverless function instance. A sequential attacker (the common case — a script or
// bot hammering /login one request at a time) hits the same warm instance and gets caught.
// A distributed attack spread across many concurrent instances could each get a fresh, empty
// Map and evade this. The Vercel Firewall rate-limit rule (see repo README / ForexMind vault
// notes) is the platform-level backstop for that case — this file handles the precise
// "5 wrong passwords" behavior Carlos asked for; the firewall handles raw request volume.

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Entry = { count: number; lockedUntil: number | null };
const attempts = new Map<string, Entry>();

function cleanup(now: number) {
  for (const [ip, entry] of attempts) {
    if (entry.lockedUntil !== null && entry.lockedUntil < now) attempts.delete(ip);
  }
}

export function checkLockout(ip: string): { locked: true; retryInMinutes: number } | { locked: false } {
  const now = Date.now();
  cleanup(now);
  const entry = attempts.get(ip);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, retryInMinutes: Math.ceil((entry.lockedUntil - now) / 60000) };
  }
  return { locked: false };
}

export function recordFailure(ip: string): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const entry = attempts.get(ip) ?? { count: 0, lockedUntil: null };
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    attempts.set(ip, entry);
    return { locked: true, attemptsRemaining: 0 };
  }

  attempts.set(ip, entry);
  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - entry.count };
}

export function recordSuccess(ip: string) {
  attempts.delete(ip);
}
