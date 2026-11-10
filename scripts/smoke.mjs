// Prueba de humo de la API: node scripts/smoke.mjs [BASE_URL]
const BASE = process.argv[2] || "http://localhost:3000";
let fails = 0;
const ok = (c, m) => { console.log(c ? "✓" : "✗", m); if (!c) fails++; };

class Browser { // un "navegador" = un jar de cookies
  cookie = "";
  async req(path, body) {
    const r = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", cookie: this.cookie }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const sc = r.headers.getSetCookie?.() ?? [];
    if (sc.length) this.cookie = sc.map((c) => c.split(";")[0]).join("; ");
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = t; }
    return { s: r.status, j };
  }
}

const admin = new Browser();
const c = await admin.req("/api/campaigns", { title: "Prueba", items: [{ name: "Partido A", kind: "party" }, { name: "Persona B", kind: "person" }, { name: "C", kind: "party" }] });
ok(c.s === 200 && c.j.slug && c.j.adminToken, "1. crear campaña");
const { slug, adminToken } = c.j;
ok((await admin.req("/api/campaigns", { title: "", items: [] })).s === 400, "validación rechaza datos vacíos");
ok((await admin.req("/api/campaigns", { title: "x", items: [{ name: "a", kind: "party", photo: "data:text/html;base64,AAAA" }, { name: "b", kind: "party" }] })).s === 400, "validación rechaza foto no imagen");

const u1 = new Browser();
const info = await u1.req(`/api/c/${slug}`);
ok(info.s === 200 && info.j.items.length === 3 && !info.j.mine, "2. abrir enlace público");
const ids = info.j.items.map((i) => i.id);
ok((await u1.req(`/api/c/${slug}/results`)).s === 403, "resultados bloqueados antes de enviar");
ok((await u1.req(`/api/c/${slug}/respond`, { ratings: {} })).s === 400, "exige posicionar ≥1 elemento");
ok((await u1.req(`/api/c/${slug}/respond`, { ratings: { [ids[0]]: 120 } })).s === 400, "rechaza valor fuera de 0-100");
ok((await u1.req(`/api/c/${slug}/respond`, { ratings: { [ids[0]]: 20 } })).s === 200, "3. enviar valoración parcial");
ok((await u1.req(`/api/c/${slug}/respond`, { ratings: { [ids[0]]: 30, [ids[1]]: 80 } })).s === 200, "4. editar valoración");
const r1 = await u1.req(`/api/c/${slug}/results`);
ok(r1.s === 200 && r1.j.participants === 1 && r1.j.mine[ids[0]] === 30, "la edición reemplaza (1 participante, valor nuevo)");
ok(r1.j.available === false && r1.j.stats.length === 0, "6. sin estadísticas colectivas con <5 participantes");

const a = await admin.req(`/api/admin/${adminToken}`);
ok(a.s === 200 && a.j.participants === 1 && a.j.items.length === 3 && !a.j.available, "7. acceso admin");
ok((await admin.req(`/api/admin/zzz`)).s === 404, "admin con token falso → 404");
ok((await admin.req(`/api/admin/${adminToken}/csv`)).s === 403, "CSV bloqueado con <5 participantes");

for (let i = 0; i < 4; i++) {
  const b = new Browser(); await b.req(`/api/c/${slug}`);
  await b.req(`/api/c/${slug}/respond`, { ratings: { [ids[0]]: 10 + i * 10, [ids[1]]: 90 } });
}
const r5 = await u1.req(`/api/c/${slug}/results`);
ok(r5.j.participants === 5 && r5.j.available, "con 5 participantes se desbloquea");
const s0 = r5.j.stats.find((s) => s.id === ids[0]), s2 = r5.j.stats.find((s) => s.id === ids[2]);
ok(s0.count === 5 && s0.mean === 26 && s0.median === 30 && s0.histogram.reduce((x, y) => x + y) === 5, "media/mediana/distribución correctas");
ok(s2.count === 0 && s2.mean === null, "elemento con <5 valoraciones sin estadísticas");
const csv = await admin.req(`/api/admin/${adminToken}/csv`);
ok(csv.s === 200 && String(csv.j).includes("Partido A"), "CSV con ≥5 participantes");

ok((await admin.req(`/api/admin/${adminToken}/close`, {})).s === 200, "cerrar campaña");
ok((await u1.req(`/api/c/${slug}/respond`, { ratings: { [ids[0]]: 50 } })).s === 403, "cerrada: no acepta modificaciones");
ok((await u1.req(`/api/c/${slug}/results`)).s === 200, "cerrada: participantes siguen viendo resultados");
console.log(fails ? `\n${fails} FALLOS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
