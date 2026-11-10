"use client";
import { useState } from "react";
import { Avatar } from "./Arc";
import { CopyField, Qr } from "./Bits";
import { api, resizePhoto } from "@/lib/client";

type Row = { key: number; name: string; kind: "party" | "person"; photo: string | null };
let k = 0;
const blank = (): Row => ({ key: ++k, name: "", kind: "party", photo: null });

export default function Create() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [rows, setRows] = useState<Row[]>([blank(), blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ pub: string; admin: string } | null>(null);

  const set = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const valid = title.trim() && rows.filter((r) => r.name.trim()).length >= 2;

  async function publish() {
    setError(""); setBusy(true);
    try {
      const res = await api<{ slug: string; adminToken: string }>("/api/campaigns", {
        title, description: description || null,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        items: rows.filter((r) => r.name.trim()).map(({ name, kind, photo }) => ({ name, kind, photo })),
      });
      setDone({ pub: `${location.origin}/c/${res.slug}`, admin: `${location.origin}/admin/${res.adminToken}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="card fade-in mx-auto max-w-2xl space-y-6 p-6 sm:p-8" data-testid="published">
        <div>
          <h2 className="text-2xl font-bold">¡Campaña publicada!</h2>
          <p className="text-gray-600">Comparte el enlace público. Guarda el enlace privado: es la única forma de administrar la campaña.</p>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex-1 space-y-4">
            <CopyField label="Enlace público (participar)" value={done.pub} />
            <CopyField label="Enlace privado (administrar)" value={done.admin} hint="No lo compartas. No se puede recuperar." />
          </div>
          <Qr url={done.pub} />
        </div>
        <div className="flex gap-2">
          <a className="btn btn-primary" href={done.admin}>Ir al panel</a>
          <a className="btn btn-ghost" href={done.pub}>Ver como participante</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
      <h2 className="text-xl font-bold">Nueva campaña</h2>
      <div className="space-y-3">
        <input className="input" placeholder="Título (obligatorio)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={2} placeholder="Descripción (opcional)" maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="block text-sm text-gray-600">Fecha de cierre (opcional)
          <input type="datetime-local" className="input mt-1" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </label>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Elementos a posicionar</h3>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="fade-in flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] p-2">
              <label className="cursor-pointer" title="Añadir fotografía">
                <Avatar item={{ id: String(r.key), name: r.name || "?", kind: r.kind, photo: r.photo }} size={44} />
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  try { set(r.key, { photo: await resizePhoto(f) }); } catch (er) { setError((er as Error).message); }
                }} />
              </label>
              <input className="input min-w-0 flex-1" placeholder="Nombre" maxLength={60} value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} />
              <select className="input w-auto" value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value as Row["kind"] })}>
                <option value="party">Partido</option><option value="person">Persona</option>
              </select>
              {r.photo && <button className="text-xs text-gray-500 underline" onClick={() => set(r.key, { photo: null })}>Quitar foto</button>}
              <button className="rounded-full px-2 text-xl text-gray-400 hover:text-red-600" aria-label="Eliminar" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>×</button>
            </div>
          ))}
        </div>
        {rows.length < 24 && <button className="btn btn-ghost mt-3" onClick={() => setRows((r) => [...r, blank()])}>+ Añadir elemento</button>}
        <p className="mt-2 text-xs text-gray-500">Mínimo 2 elementos. Una vez publicada, la lista queda bloqueada. Toca el círculo para añadir foto (si no, se usan las iniciales).</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="btn btn-primary w-full" disabled={!valid || busy} onClick={publish}>{busy ? "Publicando…" : "Publicar campaña"}</button>
    </div>
  );
}
