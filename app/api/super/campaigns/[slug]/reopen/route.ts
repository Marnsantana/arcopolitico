import { db } from "@/lib/db";
import { isSuper } from "@/lib/super";
import { fail, json } from "@/lib/server";

/** Reabre una campaña cerrada (si la fecha de cierre ya pasó, se elimina para que no se vuelva a cerrar sola). */
export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSuper())) return fail("No autorizado", 401);
  const { slug } = await params;
  const r = await db().query(
    "update campaigns set closed_at = null, closes_at = case when closes_at <= now() then null else closes_at end where slug = $1",
    [slug],
  );
  return r.rowCount ? json({ ok: true }) : fail("Campaña no encontrada", 404);
}
