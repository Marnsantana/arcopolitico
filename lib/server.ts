import { createHash, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { MIN_PARTICIPANTS } from "./stats";
import { isSuper } from "./super";

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = (bytes: number) => randomBytes(bytes).toString("base64url");
export const uid = randomUUID;

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (msg: string, status = 400) => json({ error: msg }, status);

/** Lee el límite de tamaño del cuerpo y lo parsea como JSON. */
export async function readJson(req: Request, maxBytes = 1_500_000): Promise<unknown | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Identidad anónima por navegador: cookie httpOnly emitida por el servidor; se guarda solo su hash. */
export async function voterHash(create: boolean): Promise<string | null> {
  const jar = await cookies();
  let t = jar.get("ap_voter")?.value;
  if (!t || !/^[A-Za-z0-9_-]{20,64}$/.test(t)) {
    if (!create) return null;
    t = token(24);
    jar.set("ap_voter", t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400, path: "/" });
  }
  return sha(t);
}

export type Campaign = {
  id: string; slug: string; title: string; description: string | null;
  closes_at: string | null; closed_at: string | null; created_at: string; closed: boolean;
  results_mode: "on_vote" | "after_votes" | "on_close"; results_min: number;
};
export type Item = { id: string; name: string; kind: "party" | "person"; photo: string | null };

function withClosed(r: Omit<Campaign, "closed">): Campaign {
  const closed = !!r.closed_at || (!!r.closes_at && new Date(r.closes_at).getTime() <= Date.now());
  return { ...r, closed };
}

export async function campaignBy(col: "slug" | "admin_hash", value: string): Promise<Campaign | null> {
  const { rows } = await db().query(`select id, slug, title, description, closes_at, closed_at, created_at, results_mode, results_min from campaigns where ${col} = $1`, [value]);
  return rows[0] ? withClosed(rows[0]) : null;
}

export async function itemsOf(campaignId: string): Promise<Item[]> {
  const { rows } = await db().query("select id, name, kind, photo from items where campaign_id = $1 order by position", [campaignId]);
  return rows;
}

export async function allRatings(campaignId: string): Promise<Record<string, number>[]> {
  const { rows } = await db().query("select ratings from responses where campaign_id = $1", [campaignId]);
  return rows.map((r) => r.ratings);
}

/** ¿Puede un participante ver ya los resultados colectivos? (el mínimo de privacidad de 5 se aplica siempre) */
export function collectiveUnlocked(c: Campaign, participants: number): boolean {
  if (participants < MIN_PARTICIPANTS) return false;
  if (c.results_mode === "on_close") return c.closed;
  if (c.results_mode === "after_votes") return c.closed || participants >= c.results_min;
  return true;
}

/** Campaña a administrar: por token privado, o por "~slug" si hay sesión de superadmin. */
export async function adminCampaign(token: string): Promise<Campaign | null> {
  if (token.startsWith("~")) return (await isSuper()) ? campaignBy("slug", token.slice(1)) : null;
  return campaignBy("admin_hash", sha(token));
}
