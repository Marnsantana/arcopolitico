"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Row = { slug: string; title: string; created_at: string; closes_at: string | null; closed: boolean; results_mode: string; results_min: number; items: number; participants: number };

const fmt = (d: string) => new Date(d).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
const modeLabel = (m: string, n: number) => (m === "on_vote" ? "Al votar" : m === "after_votes" ? `A ${n} o al cerrar` : "Al cerrar");

export default function Super() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<{ campaigns: Row[] }>("/api/super/campaigns")).campaigns); setAuth(true); }
    catch { setAuth(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("/api/super/login", { password: pw }); setPw(""); await load(); }
    catch (er) { setError((er as Error).message); } finally { setBusy(false); }
  }

  async function remove(r: Row) {
    if (!confirm(`¿Eliminar «${r.title}» definitivamente? Se borrarán sus elementos y ${r.participants} respuesta(s). No se puede deshacer.`)) return;
    try { await fetch(`/api/super/campaigns/${r.slug}`, { method: "DELETE" }).then((x) => { if (!x.ok) throw new Error("No se pudo eliminar"); }); load(); }
    catch (er) { setError((er as Error).message); }
  }

  if (auth === null) return <p className="mt-20 text-center text-gray-500">Cargando…</p>;

  if (!auth || !rows) {
    return (
      <form onSubmit={login} className="card fade-in mx-auto mt-10 max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-bold">Superadmin</h1>
        <input type="password" autoComplete="current-password" autoFocus className="input" placeholder="Contraseña" value={pw} onChange={(e) => setPw(e.target.value)} />
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={!pw || busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    );
  }

  const list = rows.filter((r) => (r.title + " " + r.slug).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Superadmin</h1><p className="text-sm text-gray-500">{rows.length} campañas · {rows.reduce((a, r) => a + r.participants, 0)} respuestas en total</p></div>
        <div className="flex gap-2">
          <input className="input w-56" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-ghost" onClick={async () => { await api("/api/super/logout", {}); setAuth(false); setRows(null); }}>Salir</button>
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-gray-500">
            <tr><th className="p-3">Campaña</th><th>Estado</th><th>Part.</th><th>Elem.</th><th>Resultados</th><th>Creada</th><th /></tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.slug} className="border-t border-[var(--line)]">
                <td className="p-3"><a className="font-medium underline-offset-2 hover:underline" href={`/super/c/${r.slug}`}>{r.title}</a><div className="text-xs text-gray-400">{r.slug}</div></td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.closed ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>{r.closed ? "Cerrada" : "Abierta"}</span></td>
                <td>{r.participants}</td><td>{r.items}</td>
                <td className="text-gray-600">{modeLabel(r.results_mode, r.results_min)}</td>
                <td className="text-gray-600">{fmt(r.created_at)}</td>
                <td className="space-x-2 whitespace-nowrap p-3 text-right">
                  <a className="btn btn-ghost !px-3 !py-1 text-sm" href={`/super/c/${r.slug}`}>Administrar</a>
                  <button className="text-sm text-gray-400 hover:text-red-600" onClick={() => remove(r)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Sin campañas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
