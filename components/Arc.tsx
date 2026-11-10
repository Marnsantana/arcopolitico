"use client";
import { useId, useRef, useState } from "react";
import { arcColor, initials } from "@/lib/client";

export type ArcItem = { id: string; name: string; kind: "party" | "person"; photo: string | null };
type Values = Record<string, number | undefined>;

const W = 1000, H = 560, CX = 500, CY = 480, R = 370, BAND = 40, MR = 30;

const polar = (v: number, r: number) => {
  const a = Math.PI * (1 - v / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};

// Banda en degradado: segmentos finos de rojo → gris → azul.
const SEGMENTS = Array.from({ length: 100 }, (_, i) => {
  const a = polar(i, R), b = polar(i + 1.4, R);
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${R} ${R} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, color: arcColor(i + 0.5) };
});

type Mode = "both" | "out" | "in";
const laneRadius = (k: number, mode: Mode) =>
  mode === "out" ? R + 44 + (k % 2) * 62 : mode === "in" ? R - 44 - (k % 3) * 56 : R + [0, 60, -60][k % 3];

/** Reparte los elementos en "carriles" para que los que coinciden no se tapen. */
function layout(values: Values, ids: string[], mode: Mode, skip?: string | null) {
  const placed = ids.filter((id) => values[id] !== undefined && id !== skip).sort((a, b) => values[a]! - values[b]!);
  const lanes: number[][] = [];
  const out: Record<string, number> = {};
  for (const id of placed) {
    let k = 0;
    while (lanes[k]?.some((v) => Math.abs(v - values[id]!) < 5.6)) k++;
    (lanes[k] ??= []).push(values[id]!);
    out[id] = laneRadius(k, mode);
  }
  return out;
}

export function Avatar({ item, size = 40 }: { item: ArcItem; size?: number }) {
  return item.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.photo} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-slate-800 font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(item.name)}
    </span>
  );
}

function Marker({ item, v, r, size, cid, dashed, dragging, label }: {
  item: ArcItem; v: number; r: number; size: number; cid: string; dashed?: boolean; dragging?: boolean; label?: boolean;
}) {
  const { x, y } = polar(v, r);
  const col = arcColor(v);
  return (
    <g className={`marker ${dragging ? "dragging" : ""}`} style={{ transform: `translate(${x}px, ${y}px) scale(${dragging ? 1.18 : 1})` }}>
      <title>{item.name}</title>
      <circle r={size + 3} fill={col} opacity={dragging ? 0.28 : 0.16} />
      <circle r={size} fill="#1e293b" stroke={col} strokeWidth={dashed ? 3 : 4.5} strokeDasharray={dashed ? "5 4" : undefined} />
      {item.photo ? (
        <>
          <clipPath id={`${cid}-${item.id}`}><circle r={size - 2.5} /></clipPath>
          <image href={item.photo} x={-size} y={-size} width={size * 2} height={size * 2} clipPath={`url(#${cid}-${item.id})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight={700} fontSize={size * 0.8} style={{ fontFamily: "system-ui, sans-serif", userSelect: "none" }}>
          {initials(item.name)}
        </text>
      )}
      {label && (
        <text y={-size - 12} textAnchor="middle" fontSize={20} fontWeight={600} fill="#14161c" stroke="#faf9f6" strokeWidth={5} paintOrder="stroke" style={{ fontFamily: "system-ui, sans-serif" }}>
          {item.name}
        </text>
      )}
    </g>
  );
}

export function Arc({ items, values, onChange, compare, compareName = "Mi valoración", svgRef, caption }: {
  items: ArcItem[];
  values: Values;
  onChange?: (id: string, v: number | undefined) => void;
  /** Segunda serie (p. ej. la valoración personal) pintada por dentro del arco. */
  compare?: Values;
  compareName?: string;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  caption?: string;
}) {
  const own = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? own;
  const cid = useId().replace(/:/g, "");
  const [drag, setDrag] = useState<string | null>(null);
  const [dragVal, setDragVal] = useState(0);
  const ids = items.map((i) => i.id);
  const pos = layout(values, ids, compare ? "out" : "both", drag);
  const cmp = compare ? layout(compare, ids, "in") : {};
  const tray = items.filter((i) => values[i.id] === undefined);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  function begin(id: string, e: React.PointerEvent, fromTray: boolean) {
    if (!onChange) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    setDrag(id);
    const toVal = (ev: PointerEvent) => {
      const svg = ref.current!;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const dx = p.x - CX, dy = CY - p.y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(Math.max(dy, 0), dx);
      const v = Math.round((1 - ang / Math.PI) * 1000) / 10;
      const zone = dist > 110 && dist < 580 && p.y < CY + 40 && p.x > -30 && p.x < W + 30;
      return { v, zone };
    };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      const { v, zone } = toVal(ev);
      setDragVal(v);
      onChange(id, fromTray && !zone ? undefined : v);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDrag(null);
      if (!moved && fromTray) onChange(id, 50);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  return (
    <div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ touchAction: onChange ? "none" : undefined }} role="img" aria-label="Arco ideológico">
        <defs>
          <filter id={`${cid}-sh`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity=".18" /></filter>
        </defs>
        <g filter={`url(#${cid}-sh)`}>
          {SEGMENTS.map((s, i) => <path key={i} d={s.d} stroke={s.color} strokeWidth={BAND} fill="none" />)}
        </g>
        {[25, 50, 75].map((t) => {
          const a = polar(t, R - BAND / 2 - 4), b = polar(t, R + BAND / 2 + 4);
          return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.55} strokeWidth={2} />;
        })}
        <g fontFamily="system-ui, sans-serif" fontSize={19} fontWeight={600} letterSpacing={2} fill="#6b7280">
          <text x={CX - R} y={CY + 52} textAnchor="middle">EXTREMA IZQUIERDA</text>
          <text x={CX + R} y={CY + 52} textAnchor="middle">EXTREMA DERECHA</text>
          <text x={CX} y={CY - 12} textAnchor="middle" fill="#9ca3af">CENTRO</text>
        </g>
        {drag && <text x={CX} y={CY - 60} textAnchor="middle" fontSize={64} fontWeight={800} fill="#14161c" fontFamily="system-ui, sans-serif">{Math.round(dragVal)}</text>}
        {compare && items.map((it) => cmp[it.id] !== undefined && values[it.id] !== undefined && (
          // línea entre valoración personal y valor colectivo
          <line key={`l-${it.id}`} x1={polar(compare[it.id]!, cmp[it.id]).x} y1={polar(compare[it.id]!, cmp[it.id]).y} x2={polar(values[it.id]!, pos[it.id]).x} y2={polar(values[it.id]!, pos[it.id]).y} stroke="#14161c" strokeOpacity={0.18} strokeDasharray="4 5" />
        ))}
        {compare && items.map((it) => cmp[it.id] !== undefined && (
          <Marker key={`c-${it.id}`} item={it} v={compare[it.id]!} r={cmp[it.id]} size={19} cid={`${cid}c`} dashed />
        ))}
        {items.map((it) => values[it.id] !== undefined && it.id !== drag && (
          <g key={it.id} onPointerDown={(e) => begin(it.id, e, false)} style={{ cursor: onChange ? "grab" : "default", touchAction: onChange ? "none" : undefined }}>
            <Marker item={it} v={values[it.id]!} r={pos[it.id]} size={MR} cid={cid} />
          </g>
        ))}
        {drag && values[drag] !== undefined && (
          <g style={{ cursor: "grabbing", touchAction: "none" }}>
            <Marker item={byId[drag]} v={values[drag]!} r={R} size={MR} cid={cid} dragging label />
          </g>
        )}
        {caption && <text x={24} y={34} fontSize={20} fontWeight={600} fill="#9ca3af" fontFamily="system-ui, sans-serif">{caption}</text>}
      </svg>

      {compare && (
        <p className="-mt-2 text-center text-xs text-gray-500">Círculos grandes: arco colectivo · Círculos punteados (interior): {compareName.toLowerCase()}</p>
      )}

      {onChange && (
        <div className="mt-2" data-testid="tray">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {tray.length ? "Sin valorar · arrastra al arco o toca para colocar" : "Todos los elementos están en el arco"}
          </p>
          <div className="flex flex-wrap gap-2">
            {tray.map((it) => (
              <button key={it.id} type="button" onPointerDown={(e) => begin(it.id, e, true)}
                className="fade-in flex items-center gap-2 rounded-full border border-[var(--line)] bg-white py-1 pl-1 pr-3 text-sm font-medium shadow-sm active:scale-95"
                style={{ touchAction: "none", cursor: "grab" }} data-testid={`chip-${it.id}`}>
                <Avatar item={it} size={32} />{it.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
