// Matemática do painel (SPEC §7.3). Funções puras e testáveis; as consultas ao
// banco ficam nas páginas.

export interface Point {
  x: number;
  y: number;
}

export interface Regression {
  slope: number;
  intercept: number;
}

/** Regressão linear simples por mínimos quadrados. */
export function linearRegression(points: Point[]): Regression {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0]!.y };

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export interface Projection {
  predicted: number;
  min: number;
  max: number;
}

/**
 * Projeta views acumuladas em `horizonDays` à frente, por regressão linear
 * sobre os pontos (dia, acumulado). Retorna banda mín/máx (intervalo de
 * predição aproximado). Nunca projeta abaixo do acumulado atual.
 */
export function projectCumulative(
  points: Point[],
  horizonDays: number,
): Projection {
  const n = points.length;
  const lastY = n > 0 ? points[n - 1]!.y : 0;
  if (n < 2) return { predicted: lastY, min: lastY, max: lastY };

  const { slope, intercept } = linearRegression(points);
  const lastX = points[n - 1]!.x;
  const futureX = lastX + horizonDays;
  const predictedRaw = slope * futureX + intercept;

  // resíduos → desvio padrão → margem de predição
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  let sse = 0;
  let sxx = 0;
  for (const p of points) {
    const yhat = slope * p.x + intercept;
    sse += (p.y - yhat) ** 2;
    sxx += (p.x - meanX) ** 2;
  }
  const resStd = Math.sqrt(sse / Math.max(1, n - 2));
  const margin =
    sxx > 0
      ? resStd * Math.sqrt(1 + 1 / n + (futureX - meanX) ** 2 / sxx)
      : resStd;

  const predicted = Math.max(lastY, Math.round(predictedRaw));
  return {
    predicted,
    min: Math.max(lastY, Math.round(predictedRaw - margin)),
    max: Math.max(predicted, Math.round(predictedRaw + margin)),
  };
}

export interface RetentionDrop {
  bucket: number; // 0..99 (início da queda)
  atSec: number; // timestamp correspondente
  dropPct: number; // queda relativa ao pico (0..1)
}

/**
 * Expande buckets esparsos para 0..99 e acha as duas maiores quedas entre
 * buckets adjacentes (SPEC §7.3 — "onde o vídeo perde gente").
 */
export function biggestDrops(
  buckets: { bucket: number; viewers: number }[],
  durationSec: number,
  topN = 2,
): RetentionDrop[] {
  if (buckets.length === 0) return [];
  const arr = new Array<number>(100).fill(0);
  for (const b of buckets) {
    if (b.bucket >= 0 && b.bucket < 100) arr[b.bucket] = b.viewers;
  }
  const peak = arr[0] || Math.max(...arr, 1);

  const drops: RetentionDrop[] = [];
  for (let i = 0; i < 99; i++) {
    const delta = arr[i]! - arr[i + 1]!;
    if (delta > 0) {
      drops.push({
        bucket: i + 1,
        atSec: Math.round(((i + 1) / 100) * durationSec),
        dropPct: peak > 0 ? delta / peak : 0,
      });
    }
  }
  drops.sort((a, b) => b.dropPct - a.dropPct);
  return drops.slice(0, topN);
}

/** Variação percentual entre dois períodos (para os KPIs). */
export function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // sem base de comparação
  return (current - previous) / previous;
}
