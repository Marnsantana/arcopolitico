import { db } from "@/lib/db";
import { isSuper } from "@/lib/super";
import { fail, json } from "@/lib/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSuper())) return fail("No autorizado", 401);
  const { slug } = await params;
  const r = await db().query("delete from campaigns where slug = $1", [slug]); // items y respuestas se borran en cascada
  return r.rowCount ? json({ ok: true }) : fail("Campaña no encontrada", 404);
}
