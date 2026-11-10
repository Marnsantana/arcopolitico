import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "ap_super";
const TTL = 60 * 60 * 8; // 8 horas

const password = () => process.env.SUPERADMIN_PASSWORD || "";
/** La clave de firma depende de la contraseña: al cambiarla se invalidan todas las sesiones. */
const key = () => createHash("sha256").update("arco-super:" + password()).digest();
const sign = (exp: string) => createHmac("sha256", key()).update(exp).digest("hex");

export const superEnabled = () => password().length >= 8;

export function passwordOk(input: string): boolean {
  if (!superEnabled()) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password()).digest();
  return timingSafeEqual(a, b);
}

export async function startSession() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isSuper(): Promise<boolean> {
  if (!superEnabled()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const good = sign(exp);
  return sig.length === good.length && timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}

// Freno básico a la fuerza bruta (por instancia): 5 fallos cada 15 minutos por IP, más un retardo fijo.
const fails = new Map<string, { n: number; until: number }>();
export async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "local").split(",")[0].trim();
}
export function blocked(ip: string) {
  const f = fails.get(ip);
  return !!f && f.n >= 5 && f.until > Date.now();
}
export function registerFail(ip: string) {
  const f = fails.get(ip);
  fails.set(ip, f && f.until > Date.now() ? { n: f.n + 1, until: Date.now() + 15 * 60_000 } : { n: 1, until: Date.now() + 15 * 60_000 });
}
export const clearFails = (ip: string) => fails.delete(ip);
