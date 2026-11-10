import { Pool } from "pg";

const url = process.env.DATABASE_URL;
const g = globalThis as unknown as { _pool?: Pool };

export function db(): Pool {
  if (!url) throw new Error("DATABASE_URL no configurada");
  if (!g._pool) {
    g._pool = new Pool({
      connectionString: url,
      max: 3,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
  }
  return g._pool;
}
