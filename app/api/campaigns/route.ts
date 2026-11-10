import { db } from "@/lib/db";
import { createSchema } from "@/lib/schemas";
import { fail, json, readJson, sha, token } from "@/lib/server";

export async function POST(req: Request) {
  const body = await readJson(req);
  const p = createSchema.safeParse(body);
  if (!p.success) return fail("Datos no válidos: revisa título y elementos (mínimo 2).");
  const d = p.data;
  if (d.closesAt && new Date(d.closesAt).getTime() <= Date.now()) return fail("La fecha de cierre debe ser futura.");
  const slug = token(7);
  const admin = token(24);
  const client = await db().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      "insert into campaigns (slug, admin_hash, title, description, closes_at, results_mode, results_min) values ($1,$2,$3,$4,$5,$6,$7) returning id",
      [slug, sha(admin), d.title, d.description || null, d.closesAt || null, d.resultsMode, d.resultsMin],
    );
    for (let i = 0; i < d.items.length; i++) {
      const it = d.items[i];
      await client.query("insert into items (campaign_id, position, name, kind, photo) values ($1,$2,$3,$4,$5)", [rows[0].id, i, it.name, it.kind, it.photo || null]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error(e);
    return fail("No se pudo crear la campaña.", 500);
  } finally {
    client.release();
  }
  return json({ slug, adminToken: admin });
}
