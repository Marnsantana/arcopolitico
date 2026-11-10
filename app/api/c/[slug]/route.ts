import { db } from "@/lib/db";
import { campaignBy, fail, itemsOf, json, voterHash } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await campaignBy("slug", slug);
  if (!c) return fail("Campaña no encontrada", 404);
  const items = await itemsOf(c.id);
  const v = await voterHash(true);
  const { rows } = await db().query("select ratings from responses where campaign_id=$1 and voter_hash=$2", [c.id, v]);
  const { id: _id, ...pub } = c;
  void _id;
  return json({ campaign: pub, items, mine: rows[0]?.ratings ?? null });
}
