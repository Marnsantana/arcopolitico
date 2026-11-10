import { db } from "@/lib/db";
import { adminCampaign, fail, json } from "@/lib/server";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await adminCampaign(token);
  if (!c) return fail("Enlace de administración no válido", 404);
  await db().query("update campaigns set closed_at = coalesce(closed_at, now()) where id = $1", [c.id]);
  return json({ ok: true });
}
