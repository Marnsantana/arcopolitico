import { db } from "@/lib/db";
import { isSuper } from "@/lib/super";
import { fail, json, sha, token } from "@/lib/server";

/** Genera un nuevo enlace de administración (invalida el anterior). Útil si el creador lo perdió. */
export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSuper())) return fail("No autorizado", 401);
  const { slug } = await params;
  const admin = token(24);
  const r = await db().query("update campaigns set admin_hash = $1 where slug = $2", [sha(admin), slug]);
  return r.rowCount ? json({ adminToken: admin }) : fail("Campaña no encontrada", 404);
}
