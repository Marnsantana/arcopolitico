// Aplica supabase/schema.sql (idempotente) antes del build si hay DATABASE_URL.
import pg from "pg";
import { readFileSync } from "fs";
const url = process.env.DATABASE_URL;
if (!url) { console.log("migrate: sin DATABASE_URL, se omite"); process.exit(0); }
const c = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
await c.connect();
await c.query(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
await c.end();
console.log("migrate: esquema aplicado");
