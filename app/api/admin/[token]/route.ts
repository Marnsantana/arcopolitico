import { aggregate } from "@/lib/stats";
import { allRatings, campaignBy, fail, itemsOf, json, sha } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await campaignBy("admin_hash", sha(token));
  if (!c) return fail("Enlace de administración no válido", 404);
  const items = await itemsOf(c.id);
  const agg = aggregate(items.map((i) => i.id), await allRatings(c.id));
  const { id: _id, ...pub } = c;
  void _id;
  return json({ campaign: pub, items, ...agg });
}
