"use client";
import { useState } from "react";
import { Avatar, ArcItem } from "./Arc";
import { api, resizePhoto } from "@/lib/client";

// photo: undefined = sin cambios, null = quitar, string = nueva foto
type Row = { key: number; id?: string; name: string; kind: "party" | "person"; photo: string | null | undefined; shown: string | null };
let k = 0;
const fromItems = (items: ArcItem[]): Row[] => items.map((i) => ({ key: ++k, id: i.id, name: i.name, kind: i.kind, photo: undefined, shown: i.photo }));

export default function ItemsEditor({ token, items, participants, onSaved }: { token: string; items: ArcItem[]; participants: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => fromItems(items));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const valid = rows.length >= 2 && rows.every((r) => r.name.trim());
  const removed = items.filter((i) => !rows.some((r) => r.id === i.id));

  async function save() {
    if (removed.length && participants > 0 && !confirm(`Vas a quitar ${removed.length} elemento(s). Se perderán sus valoraciones (${participants} participantes). ¿Continuar?`)) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      await api(`/api/admin/${token}/items`, { items: rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, ...(r.photo !== undefined ? { photo: r.photo } : {}) })) }, "PUT");
      onSaved(); setSaved(true); setOpen(false);
      setRows(fromItems(items)); // se recarga con los datos del servidor al refrescar el panel
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="font-bold">Elementos de la campaña</h2><p className="text-sm text-gray-500">{items.length} elementos{saved && " · cambios guardados"}</p></div>
        <button className="btn btn-ghost" onClick={() => { setRows(fromItems(items)); setOpen(true); }}>Editar elementos</button>
      </div>
    );
  }

  return (
    <div className="card fade-in space-y-3 p-5">
      <h2 className="font-bold">Editar elementos</h2>
      {participants > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Ya hay {participants} participante(s). Cambiar nombres o fotos se refleja al instante; quitar un elemento borra sus valoraciones.</p>}
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={r.key} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] p-2">
            <label className="cursor-pointer" title="Cambiar fotografía">
              <Avatar item={{ id: String(r.key), name: r.name || "?", kind: r.kind, photo: r.photo === undefined ? r.shown : r.photo }} size={44} />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try { set(r.key, { photo: await resizePhoto(f) }); } catch (er) { setError((er as Error).message); }
              }} />
            </label>
            <input className="input w-auto min-w-0 flex-1 basis-40" placeholder="Nombre" maxLength={60} value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} />
            <select className="input w-auto" value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value as Row["kind"] })}>
              <option value="party">Partido</option><option value="person">Persona</option>
            </select>
            {(r.photo ?? r.shown) && <button className="text-xs text-gray-500 underline" onClick={() => set(r.key, { photo: null })}>Quitar foto</button>}
            <button className="px-1 text-gray-400 disabled:opacity-30" aria-label="Subir" disabled={idx === 0} onClick={() => setRows((x) => { const a = [...x]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; })}>↑</button>
            <button className="px-1 text-gray-400 disabled:opacity-30" aria-label="Bajar" disabled={idx === rows.length - 1} onClick={() => setRows((x) => { const a = [...x]; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; return a; })}>↓</button>
            <button className="rounded-full px-2 text-xl text-gray-400 hover:text-red-600 disabled:opacity-30" aria-label="Eliminar" disabled={rows.length <= 2} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>×</button>
          </div>
        ))}
      </div>
      {rows.length < 24 && <button className="btn btn-ghost" onClick={() => setRows((r) => [...r, { key: ++k, name: "", kind: "party", photo: null, shown: null }])}>+ Añadir elemento</button>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={!valid || busy} onClick={save}>{busy ? "Guardando…" : "Guardar cambios"}</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
