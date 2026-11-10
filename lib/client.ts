export const kindLabel = (k: string) => (k === "party" ? "Partido" : "Persona");

export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 2)).toUpperCase();
};

/** Color del arco para un valor 0..100: rojo → gris → azul. */
export function arcColor(v: number) {
  const A = [220, 38, 38], M = [156, 163, 175], B = [37, 99, 235];
  const t = v / 100;
  const [p, q, k] = t < 0.5 ? [A, M, t * 2] : [M, B, (t - 0.5) * 2];
  return `rgb(${p.map((x, i) => Math.round(x + (q[i] - x) * k)).join(",")})`;
}

/** Reduce una imagen a un cuadrado de 160px JPEG para mantener las fotos ligeras. */
export function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Archivo no válido"));
    if (file.size > 8_000_000) return reject(new Error("La imagen es demasiado grande (máx. 8 MB)"));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = 160, c = document.createElement("canvas");
      c.width = c.height = s;
      const side = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

/** Descarga un SVG como PNG. */
export function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const vb = svg.viewBox.baseVal;
  const scale = 2;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(vb.width));
  clone.setAttribute("height", String(vb.height));
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = vb.width * scale; c.height = vb.height * scale;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#faf9f6"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

export async function api<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Error inesperado");
  return d as T;
}
