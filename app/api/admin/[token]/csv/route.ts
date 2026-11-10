import { aggregate } from "@/lib/stats";
import { allRatings, adminCampaign, fail, itemsOf } from "@/lib/server";

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await adminCampaign(token);
  if (!c) return fail("Enlace de administración no válido", 404);
  const items = await itemsOf(c.id);
  const agg = aggregate(items.map((i) => i.id), await allRatings(c.id), true, token.startsWith("~") ? 1 : undefined);
  if (!agg.available) return fail(`Se necesitan al menos ${agg.min} participantes para exportar.`, 403);
  const lines = ["elemento,tipo,valoraciones,media,mediana,distribucion_0-10|10-20|...|90-100"];
  for (const it of items) {
    const s = agg.stats.find((x) => x.id === it.id)!;
    lines.push([esc(it.name), it.kind === "party" ? "partido" : "persona", s.count, s.mean ?? "", s.median ?? "", s.histogram ? esc(s.histogram.join("|")) : ""].join(","));
  }
  return new Response("﻿" + lines.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="arco-politico.csv"' },
  });
}
