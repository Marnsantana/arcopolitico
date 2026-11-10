import { blocked, clearFails, clientKey, passwordOk, registerFail, startSession, superEnabled } from "@/lib/super";
import { fail, json, readJson } from "@/lib/server";

export async function POST(req: Request) {
  if (!superEnabled()) return fail("El panel de superadmin no está configurado.", 503);
  const ip = await clientKey();
  if (blocked(ip)) return fail("Demasiados intentos. Inténtalo de nuevo en unos minutos.", 429);
  const body = (await readJson(req, 2_000)) as { password?: unknown } | null;
  await new Promise((r) => setTimeout(r, 400));
  if (typeof body?.password !== "string" || !passwordOk(body.password)) {
    registerFail(ip);
    return fail("Contraseña incorrecta.", 401);
  }
  clearFails(ip);
  await startSession();
  return json({ ok: true });
}
