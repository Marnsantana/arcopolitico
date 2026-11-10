import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/schemas";
import { campaignBy, fail, json, readJson, sha } from "@/lib/server";

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await campaignBy("admin_hash", sha(token));
  if (!c) return fail("Enlace de administración no válido", 404);
  if (c.closed) return fail("La campaña está cerrada.", 403);
  const p = settingsSchema.safeParse(await readJson(req, 2_000));
  if (!p.success) return fail("Ajuste no válido (mínimo 5 participantes).");
  await db().query("update campaigns set results_mode=$1, results_min=$2 where id=$3", [p.data.resultsMode, p.data.resultsMin, c.id]);
  return json({ ok: true });
}
