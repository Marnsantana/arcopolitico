import { aggregate } from "@/lib/stats";
import { allRatings, adminCampaign, fail, itemsOf, json } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await adminCampaign(token);
  if (!c) return fail("Enlace de administración no válido", 404);
  const items = await itemsOf(c.id);
  const agg = aggregate(items.map((i) => i.id), await allRatings(c.id));
  const { id: _id, ...pub } = c;
  void _id;
  return json({ campaign: pub, items, ...agg });
}
