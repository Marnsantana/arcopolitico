import { db } from "@/lib/db";
import { itemsSchema } from "@/lib/schemas";
import { adminCampaign, fail, itemsOf, json, readJson } from "@/lib/server";

/** Sustituye la lista de elementos de la campaña (editar, añadir, quitar, reordenar). Solo con la campaña abierta. */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await adminCampaign(token);
  if (!c) return fail("Enlace de administración no válido", 404);
  if (c.closed) return fail("La campaña está cerrada: los elementos ya no se pueden modificar.", 403);
  const p = itemsSchema.safeParse(await readJson(req));
  if (!p.success) return fail("Elementos no válidos: mínimo 2, con nombre.");

  const client = await db().connect();
  try {
    await client.query("begin");
    const keep: string[] = [];
    for (let i = 0; i < p.data.items.length; i++) {
      const it = p.data.items[i];
      if (it.id) {
        const keepPhoto = it.photo === undefined;
        const r = await client.query(
          `update items set name=$1, kind=$2, position=$3, photo = case when $4 then photo else $5 end
           where id=$6 and campaign_id=$7`,
          [it.name, it.kind, i, keepPhoto, it.photo ?? null, it.id, c.id],
        );
        if (r.rowCount !== 1) throw new Error("elemento ajeno");
        keep.push(it.id);
      } else {
        const r = await client.query(
          "insert into items (campaign_id, position, name, kind, photo) values ($1,$2,$3,$4,$5) returning id",
          [c.id, i, it.name, it.kind, it.photo ?? null],
        );
        keep.push(r.rows[0].id);
      }
    }
    await client.query("delete from items where campaign_id=$1 and id <> all($2::uuid[])", [c.id, keep]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error(e);
    return fail("No se pudieron guardar los elementos.", 400);
  } finally {
    client.release();
  }
  return json({ items: await itemsOf(c.id) });
}
