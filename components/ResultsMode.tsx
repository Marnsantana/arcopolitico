"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export type Mode = "on_vote" | "after_votes" | "on_close";

export const describeMode = (mode: Mode, min: number) =>
  mode === "on_vote" ? "Los participantes ven los resultados colectivos nada más votar (con al menos 5 participantes)."
  : mode === "after_votes" ? `Resultados visibles al llegar a ${min} participantes o al cerrar la campaña.`
  : "Resultados visibles solo cuando la campaña se cierre (con al menos 5 participantes).";

export function ResultsModePicker({ mode, min, onChange }: { mode: Mode; min: number; onChange: (mode: Mode, min: number) => void }) {
  const opts: [Mode, string][] = [
    ["on_vote", "Mostrar al votar"],
    ["after_votes", "Mostrar al alcanzar un número de participantes (o al cerrar)"],
    ["on_close", "Mostrar solo cuando termine la campaña"],
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Resultados para los participantes</legend>
      {opts.map(([m, label]) => (
        <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm transition ${mode === m ? "border-[var(--ink)] bg-gray-50" : "border-[var(--line)]"}`}>
          <input type="radio" name="results-mode" className="mt-1" checked={mode === m} onChange={() => onChange(m, min)} />
          <span className="flex-1">{label}
            {m === "after_votes" && mode === m && (
              <span className="mt-2 flex items-center gap-2">
                <input type="number" min={5} max={1000} className="input w-24" value={min} aria-label="Número de participantes"
                  onChange={(e) => onChange(m, Math.max(5, Math.min(1000, Math.round(Number(e.target.value)) || 5)))} />
                <span className="text-gray-500">participantes</span>
              </span>
            )}
          </span>
        </label>
      ))}
      <p className="text-xs text-gray-500">Por privacidad, nunca se muestran resultados colectivos con menos de 5 participantes.</p>
    </fieldset>
  );
}

/** Tarjeta del panel de administración para cambiar la visibilidad mientras la campaña esté abierta. */
export function ResultsSettings({ token, mode, min, onSaved }: { token: string; mode: Mode; min: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [m, setM] = useState<Mode>(mode);
  const [n, setN] = useState(min);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    try { await api(`/api/admin/${token}/settings`, { resultsMode: m, resultsMin: n }, "PUT"); onSaved(); setOpen(false); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="font-bold">Visibilidad de resultados</h2><p className="text-sm text-gray-500">{describeMode(mode, min)}</p></div>
        <button className="btn btn-ghost" onClick={() => { setM(mode); setN(min); setOpen(true); }}>Cambiar</button>
      </div>
    );
  }
  return (
    <div className="card fade-in space-y-3 p-5">
      <ResultsModePicker mode={m} min={n} onChange={(a, b) => { setM(a); setN(b); }} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
