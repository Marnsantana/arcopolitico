"use client";
import { useEffect, useRef, useState } from "react";
import { Arc, ArcItem, Avatar } from "./Arc";
import { StatsTable, Stat } from "./Bits";
import { api, downloadSvgAsPng } from "@/lib/client";

type Info = { campaign: { slug: string; title: string; description: string | null; closes_at: string | null; closed: boolean; results_mode: "on_vote" | "after_votes" | "on_close"; results_min: number }; items: ArcItem[]; mine: Record<string, number> | null };
type Results = { mine: Record<string, number>; participants: number; available: boolean; min: number; stats: Stat[]; mode: "on_vote" | "after_votes" | "on_close"; needed: number };
type Tab = "mine" | "collective" | "compare";

export default function Participate({ slug }: { slug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, number | undefined>>({});
  const [phase, setPhase] = useState<"rate" | "results">("rate");
  const [results, setResults] = useState<Results | null>(null);
  const [tab, setTab] = useState<Tab>("mine");
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  async function loadResults() {
    setResults(await api<Results>(`/api/c/${slug}/results`));
    setPhase("results");
  }

  useEffect(() => {
    api<Info>(`/api/c/${slug}`).then(async (d) => {
      setInfo(d);
      if (d.mine) { setValues(d.mine); await loadResults().catch(() => {}); }
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (error) return <p className="card mx-auto mt-10 max-w-md p-6 text-center">{error}</p>;
  if (!info) return <p className="mt-20 text-center text-gray-500">Cargando…</p>;

  const { campaign, items } = info;
  const rated = Object.values(values).filter((v) => v !== undefined).length;
  const set = (id: string, v: number | undefined) => setValues((s) => ({ ...s, [id]: v }));

  async function submit() {
    setBusy(true); setError("");
    try {
      const ratings = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
      await api(`/api/c/${slug}/respond`, { ratings });
      await loadResults(); setTab("mine");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const head = (
    <div className="mb-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{campaign.title}</h1>
      {campaign.description && <p className="mx-auto mt-2 max-w-2xl text-gray-600">{campaign.description}</p>}
      <p className="mt-2 text-xs text-gray-500">
        {campaign.closed ? "Campaña cerrada" : campaign.closes_at ? `Cierra el ${new Date(campaign.closes_at).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}` : "Campaña abierta"}
      </p>
    </div>
  );

  if (campaign.closed && !info.mine) {
    return <div className="fade-in">{head}<p className="card mx-auto max-w-md p-6 text-center">Esta campaña está cerrada y ya no acepta respuestas.</p></div>;
  }

  if (phase === "results" && results) {
    const collective = Object.fromEntries(results.stats.filter((s) => s.mean != null).map((s) => [s.id, s.mean as number]));
    const tabs: [Tab, string][] = [["mine", "Mi arco"], ["collective", "Arco colectivo"], ["compare", "Comparar"]];
    const locked = !results.available;
    return (
      <div className="fade-in">
        {head}
        <div className="mx-auto mb-4 flex w-fit rounded-full border border-[var(--line)] bg-white p-1" role="tablist">
          {tabs.map(([t, l]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-[var(--ink)] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{l}</button>
          ))}
        </div>

        <div className="card p-3 sm:p-6">
          {tab !== "mine" && locked ? (
            <div className="py-16 text-center" data-testid="locked">
              <p className="text-lg font-semibold">Resultados colectivos aún no disponibles</p>
              <p className="mt-1 text-gray-600">
                {results.mode === "on_close" ? `Se mostrarán cuando termine la campaña (y haya al menos ${results.min} participantes; ahora hay ${results.participants}).`
                  : results.mode === "after_votes" ? `Se mostrarán al llegar a ${Math.max(results.needed, results.min)} participantes (ahora ${results.participants}) o cuando termine la campaña.`
                  : `Se mostrarán cuando haya al menos ${results.min} participantes (${results.participants} de ${results.min} hasta ahora).`}
              </p>
            </div>
          ) : (
            <Arc svgRef={svgRef} items={items}
              values={tab === "mine" ? results.mine : collective}
              compare={tab === "compare" ? results.mine : undefined}
              caption={`${campaign.title} · ${tab === "mine" ? "Mi arco" : tab === "collective" ? "Arco colectivo" : "Comparación"}`} />
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!(tab !== "mine" && locked) && (
              <button className="btn btn-ghost" onClick={() => svgRef.current && downloadSvgAsPng(svgRef.current, `arco-${tab}.png`)}>Descargar PNG</button>
            )}
            {!campaign.closed && <button className="btn btn-ghost" onClick={() => { setValues(results.mine); setPhase("rate"); }}>Editar mi valoración</button>}
          </div>
        </div>

        {tab !== "mine" && !locked && (
          <div className="card mt-6 p-4 sm:p-6">
            <h2 className="mb-2 font-bold">Estadísticas · {results.participants} participantes</h2>
            <StatsTable items={items} stats={results.stats} mine={tab === "compare" ? results.mine : null} />
          </div>
        )}
        {tab === "mine" && !locked && <p className="mt-4 text-center text-sm text-gray-500">{results.participants} participantes · mira el arco colectivo o compara.</p>}
        {tab === "mine" && locked && <p className="mt-4 text-center text-sm text-gray-500">Participantes: {results.participants}. El arco colectivo aún no está disponible.</p>}
      </div>
    );
  }

  return (
    <div className="fade-in">
      {head}
      <div className="card p-3 sm:p-6">
        <Arc svgRef={svgRef} items={items} values={values} onChange={set} />
      </div>

      <div className="card mt-6 divide-y divide-[var(--line)]">
        {items.map((it) => {
          const v = values[it.id];
          return (
            <div key={it.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              <div className="flex w-full items-center gap-2 sm:w-52"><Avatar item={it} size={34} /><span className="truncate font-medium">{it.name}</span></div>
              <input type="range" min={0} max={100} step={1} value={v ?? 50} aria-label={`Posición de ${it.name}`}
                className={`arc-range flex-1 ${v === undefined ? "unset" : ""}`}
                onChange={(e) => set(it.id, Number(e.target.value))} />
              <div className="flex w-20 items-center justify-end gap-2 text-sm">
                {v === undefined ? <span className="text-gray-400">—</span> : <><b>{Math.round(v)}</b><button aria-label={`Quitar ${it.name}`} className="text-gray-400 hover:text-red-600" onClick={() => set(it.id, undefined)}>×</button></>}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-6 text-center">
        <button className="btn btn-primary" disabled={!rated || busy} onClick={submit} data-testid="submit">
          {busy ? "Enviando…" : info.mine ? "Guardar cambios" : "Enviar valoración"}
        </button>
        <p className="mt-2 text-xs text-gray-500">{campaign.results_mode === "on_vote" ? "" : campaign.results_mode === "on_close" ? "Los resultados colectivos se publicarán al cerrar la campaña. " : `Los resultados colectivos se publicarán al llegar a ${campaign.results_min} participantes o al cerrar la campaña. `}</p>
        <p className="mt-2 text-xs text-gray-500">{rated ? `${rated} de ${items.length} valorados` : "Posiciona al menos un elemento para enviar"} · Puedes dejar elementos sin valorar</p>
        {info.mine && <button className="mt-2 block w-full text-sm text-gray-500 underline" onClick={() => setPhase("results")}>Volver a los resultados</button>}
      </div>
    </div>
  );
}
