export const MIN_PARTICIPANTS = 5;
export const MIN_RATINGS = 5;

export type ItemStats = {
  id: string;
  count: number;
  mean: number | null;
  median: number | null;
  histogram: number[] | null; // 10 tramos de 10 puntos
};

export type Rated = Record<string, number>;

export function statsFor(id: string, all: Rated[], minRatings = MIN_RATINGS): ItemStats {
  const vals = all.map((r) => r[id]).filter((v) => typeof v === "number").sort((a, b) => a - b);
  const n = vals.length;
  if (n < minRatings) return { id, count: n, mean: null, median: null, histogram: null };
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
  const histogram = Array(10).fill(0);
  for (const v of vals) histogram[Math.min(9, Math.floor(v / 10))]++;
  return { id, count: n, mean: Math.round(mean * 10) / 10, median: Math.round(median * 10) / 10, histogram };
}

/** `unlocked`: la campaña permite ya publicar resultados (modo de visibilidad). El mínimo de privacidad se aplica siempre. */
/** `floor`: mínimo de privacidad (participantes y valoraciones por elemento). Solo el superadmin usa un valor menor que 5. */
export function aggregate(itemIds: string[], all: Rated[], unlocked = true, floor = MIN_PARTICIPANTS) {
  const participants = all.length;
  const available = unlocked && participants >= floor;
  return {
    participants,
    available,
    min: floor,
    stats: available ? itemIds.map((id) => statsFor(id, all, floor)) : [],
  };
}
