"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { CopyField } from "./Bits";

/** Acciones exclusivas del superadmin sobre una campaña. */
export default function SuperTools({ slug, closed, onChange }: { slug: string; closed: boolean; onChange: () => void }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => { setError(""); try { await fn(); } catch (e) { setError((e as Error).message); } };

  return (
    <div className="card space-y-3 border-amber-300 bg-amber-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Superadmin</h2>
        <a className="text-sm underline" href="/super">← Todas las campañas</a>
      </div>
      <div className="flex flex-wrap gap-2">
        {closed && <button className="btn btn-ghost" onClick={() => run(async () => { await api(`/api/super/campaigns/${slug}/reopen`, {}); onChange(); })}>Reabrir campaña</button>}
        <button className="btn btn-ghost" onClick={() => run(async () => {
          if (!confirm("Se generará un enlace de administración nuevo y el anterior dejará de funcionar. ¿Continuar?")) return;
          const r = await api<{ adminToken: string }>(`/api/super/campaigns/${slug}/admin-link`, {});
          setLink(`${location.origin}/admin/${r.adminToken}`);
        })}>Nuevo enlace de administración</button>
        <button className="btn btn-ghost !text-red-600" onClick={() => run(async () => {
          if (!confirm("¿Eliminar esta campaña y todas sus respuestas? No se puede deshacer.")) return;
          const r = await fetch(`/api/super/campaigns/${slug}`, { method: "DELETE" });
          if (!r.ok) throw new Error("No se pudo eliminar");
          location.href = "/super";
        })}>Eliminar campaña</button>
      </div>
      {link && <CopyField label="Nuevo enlace privado (se muestra una sola vez)" value={link} />}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
