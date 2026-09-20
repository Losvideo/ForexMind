import "server-only";
import { neon } from "@neondatabase/serverless";

// Lazy init — process.env.DATABASE_URL isn't guaranteed at module-load/build time.
let _sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
