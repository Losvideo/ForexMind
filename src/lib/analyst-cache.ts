import "server-only";
import { getDb } from "@/lib/db";

// Server-side floor under the 10-minute cadence: whether a request is triggered by an
// automatic poll or a manual "refresh now" click, a real Gemini call only happens if the
// cache is actually stale. This is what makes "on demand" safe to expose without a client-side
// timer — mashing refresh can't burn extra calls.
export async function getCachedOrNull<T>(module: string, maxAgeMinutes: number): Promise<T | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT payload FROM analyst_cache
    WHERE module = ${module} AND generated_at > now() - (${maxAgeMinutes} || ' minutes')::interval
  `) as { payload: T }[];
  return rows[0]?.payload ?? null;
}

export async function setCache<T>(module: string, payload: T) {
  const sql = getDb();
  await sql`
    INSERT INTO analyst_cache (module, generated_at, payload)
    VALUES (${module}, now(), ${JSON.stringify(payload)})
    ON CONFLICT (module) DO UPDATE SET generated_at = now(), payload = ${JSON.stringify(payload)}
  `;
}
