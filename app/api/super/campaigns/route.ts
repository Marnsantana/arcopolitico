import { db } from "@/lib/db";
import { isSuper } from "@/lib/super";
import { fail, json } from "@/lib/server";

export async function GET() {
  if (!(await isSuper())) return fail("No autorizado", 401);
  const { rows } = await db().query(`
    select c.slug, c.title, c.created_at, c.closes_at, c.closed_at, c.results_mode, c.results_min,
      (select count(*)::int from items i where i.campaign_id = c.id) as items,
      (select count(*)::int from responses r where r.campaign_id = c.id) as participants
    from campaigns c order by c.created_at desc`);
  const now = Date.now();
  return json({
    campaigns: rows.map((r) => ({ ...r, closed: !!r.closed_at || (!!r.closes_at && new Date(r.closes_at).getTime() <= now) })),
  });
}
