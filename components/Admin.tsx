"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arc, ArcItem } from "./Arc";
import { CopyField, Qr, Stat, StatsTable } from "./Bits";
import ItemsEditor from "./ItemsEditor";
import SuperTools from "./SuperTools";
import { Mode, ResultsSettings, describeMode } from "./ResultsMode";
import { api, downloadSvgAsPng } from "@/lib/client";

type Camp = { slug: string; title: string; description: string | null; closes_at: string | null; closed: boolean; results_mode: Mode; results_min: number };
type Raw = { campaign: Camp; items: ArcItem[]; participants: number; available: boolean; min: number; stats: Stat[] };

export default function Admin({ token }: { token: string }) {
  const [d, setD] = useState<Raw | null>(null);
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const load = useCallback(() => api<Raw>(`/api/admin/${token}`).then(setD).catch((e) => setError(e.message)), [token]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="card mx-auto mt-10 max-w-md p-6 text-center">{error}{token.startsWith("~") && <> <a className="underline" href="/super">Entrar como superadmin</a></>}</p>;
  if (!d) return <p className="mt-20 text-center text-gray-500">Cargando…</p>;

  const c = d.campaign;
  return <Panel token={token} d={d} c={c} svgRef={svgRef} reload={load} />;
}

function Panel({ token, d, c, svgRef, reload }: { token: string; d: Raw; c: Camp; svgRef: React.RefObject<SVGSVGElement | null>; reload: () => void }) {
  const stats = d.stats;
  const collective = Object.fromEntries(stats.filter((s) => s.mean != null).map((s) => [s.id, s.mean as number]));
  const pub = typeof location !== "undefined" ? `${location.origin}/c/${c.slug}` : "";
  const hasStats = d.available;

  async function close() {
    if (!confirm("¿Cerrar la campaña? No se aceptarán más respuestas ni modificaciones.")) return;
    await api(`/api/admin/${token}/close`, {});
    reload();
  }

  return (
    <div className="fade-in space-y-6">
      {token.startsWith("~") && <SuperTools slug={c.slug} closed={c.closed} onChange={reload} />}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Panel de administración</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{c.closed ? "Cerrada" : c.closes_at ? `Se cerrará el ${new Date(c.closes_at).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}` : "Abierta"}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="card space-y-4 p-5">
          <CopyField label="Enlace público" value={pub} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-gray-50 px-5 py-3"><p className="text-3xl font-extrabold" data-testid="participants">{d.participants}</p><p className="text-xs text-gray-500">participantes</p></div>
            {!c.closed && <button className="btn btn-ghost" onClick={close}>Cerrar campaña</button>}
            {hasStats && <a className="btn btn-ghost" href={`/api/admin/${token}/csv`}>Exportar CSV</a>}
          </div>
        </div>
        <div className="card flex items-center justify-center p-5"><Qr url={pub} /></div>
      </div>

      <div className="card p-3 sm:p-6">
        {hasStats ? (
          <>
            <Arc svgRef={svgRef} items={d.items} values={collective} caption={`${c.title} · Arco colectivo`} />
            <div className="mt-3 text-center"><button className="btn btn-ghost" onClick={() => svgRef.current && downloadSvgAsPng(svgRef.current, "arco-colectivo.png")}>Descargar PNG</button></div>
          </>
        ) : (
          <p className="py-14 text-center text-gray-600" data-testid="locked">Los resultados se mostrarán con al menos {d.min} participantes ({d.participants} de {d.min}).</p>
        )}
      </div>

      {c.closed ? <p className="text-center text-sm text-gray-500">{describeMode(c.results_mode, c.results_min)}</p> : <ResultsSettings key={c.results_mode + c.results_min} token={token} mode={c.results_mode} min={c.results_min} onSaved={reload} />}

      {!c.closed && <ItemsEditor key={d.items.map((i) => i.id + i.name + i.kind + (i.photo?.length ?? 0)).join("|")} token={token} items={d.items} participants={d.participants} onSaved={reload} />}

      {hasStats && <div className="card p-4 sm:p-6"><h2 className="mb-2 font-bold">Estadísticas</h2><StatsTable items={d.items} stats={stats} /></div>}
    </div>
  );
}
