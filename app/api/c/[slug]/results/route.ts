import { db } from "@/lib/db";
import { aggregate } from "@/lib/stats";
import { allRatings, campaignBy, fail, itemsOf, json, voterHash } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await campaignBy("slug", slug);
  if (!c) return fail("Campaña no encontrada", 404);
  const v = await voterHash(false);
  const { rows } = v ? await db().query("select ratings from responses where campaign_id=$1 and voter_hash=$2", [c.id, v]) : { rows: [] };
  // Solo quien ya ha enviado su valoración puede ver resultados.
  if (!rows[0]) return fail("Envía tu valoración para ver los resultados.", 403);
  const items = await itemsOf(c.id);
  const agg = aggregate(items.map((i) => i.id), await allRatings(c.id));
  return json({ mine: rows[0].ratings, ...agg });
}
