"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Avatar, ArcItem } from "./Arc";
import { arcColor } from "@/lib/client";

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className="input text-sm" onFocus={(e) => e.currentTarget.select()} />
        <button className="btn btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1600); }}>
          {ok ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 360 }).then(setSrc); }, [url]);
  if (!src) return null;
  return (
    <div className="inline-block text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Código QR del enlace público" className="h-40 w-40 rounded-xl border border-[var(--line)] bg-white p-1" />
      <a href={src} download="arco-politico-qr.png" className="mt-1 block text-xs text-gray-500 underline">Descargar QR</a>
    </div>
  );
}

export type Stat = { id: string; count: number; mean: number | null; median: number | null; histogram: number[] | null };

export function StatsTable({ items, stats, mine }: { items: ArcItem[]; stats: Stat[]; mine?: Record<string, number> | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-gray-500">
          <tr><th className="py-2">Elemento</th><th>Valoraciones</th><th>Media</th><th>Mediana</th><th>Distribución</th>{mine && <><th>Mi valor</th><th>Diferencia</th></>}</tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const s = stats.find((x) => x.id === it.id);
            const m = mine?.[it.id];
            const diff = m !== undefined && s?.mean != null ? m - s.mean : null;
            const max = Math.max(1, ...(s?.histogram ?? [1]));
            return (
              <tr key={it.id} className="border-t border-[var(--line)]">
                <td className="py-2"><span className="flex items-center gap-2"><Avatar item={it} size={28} /><span className="font-medium">{it.name}</span></span></td>
                <td>{s?.count ?? 0}</td>
                <td>{s?.mean ?? <span className="text-gray-400" title="Se necesitan 5 valoraciones">—</span>}</td>
                <td>{s?.median ?? <span className="text-gray-400">—</span>}</td>
                <td>
                  {s?.histogram ? (
                    <span className="flex h-7 items-end gap-0.5" aria-label="Distribución">
                      {s.histogram.map((h, i) => <span key={i} className="w-2 rounded-sm" style={{ height: `${Math.max(8, (h / max) * 100)}%`, background: arcColor(i * 10 + 5), opacity: h ? 1 : 0.2 }} title={`${i * 10}–${(i + 1) * 10}: ${h}`} />)}
                    </span>
                  ) : <span className="text-xs text-gray-400">mín. 5 valoraciones</span>}
                </td>
                {mine && <>
                  <td>{m ?? <span className="text-gray-400">sin valorar</span>}</td>
                  <td className={diff == null ? "text-gray-400" : "font-semibold"}>{diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
