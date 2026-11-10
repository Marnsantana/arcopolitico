import { db } from "@/lib/db";
import { respondSchema } from "@/lib/schemas";
import { campaignBy, fail, itemsOf, json, readJson, voterHash } from "@/lib/server";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await campaignBy("slug", slug);
  if (!c) return fail("Campaña no encontrada", 404);
  if (c.closed) return fail("La campaña está cerrada.", 403);
  const p = respondSchema.safeParse(await readJson(req, 20_000));
  if (!p.success) return fail("Valoración no válida.");
  const valid = new Set((await itemsOf(c.id)).map((i) => i.id));
  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.data.ratings)) if (valid.has(k)) ratings[k] = Math.round(v * 10) / 10;
  if (!Object.keys(ratings).length) return fail("Posiciona al menos un elemento.");
  const v = (await voterHash(true))!;
  // Una respuesta por navegador y campaña: la nueva reemplaza a la anterior.
  await db().query(
    `insert into responses (campaign_id, voter_hash, ratings) values ($1,$2,$3)
     on conflict (campaign_id, voter_hash) do update set ratings = excluded.ratings, updated_at = now()`,
    [c.id, v, JSON.stringify(ratings)],
  );
  return json({ ok: true });
}
