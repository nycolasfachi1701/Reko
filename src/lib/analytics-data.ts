import "server-only";
import { db } from "@/lib/db";
import { VideoStatus } from "@prisma/client";
import { projectCumulative, type Projection } from "@/lib/analytics";

const DAY = 86400000;
const MIN_VIEW_SECONDS = 3; // regra dos 3s (SPEC §6.3)

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function shortLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export interface VideoStats {
  views: number;
  distinctViewers: number;
  totalWatchedSec: number;
  avgWatchedSec: number;
  completionRate: number; // 0..1
  daily: { label: string; value: number }[];
  devices: { device: string; count: number }[];
}

/** Métricas do bloco "Visualizações" de um vídeo (últimos 30 dias na série). */
export async function videoDetailStats(videoId: string): Promise<VideoStats> {
  // Agrega no banco (não puxa as linhas para o JS): a "regra dos 3s" vira um
  // filtro; contagem/soma/distintos/série/devices saem de queries agregadas.
  const where = { videoId, watchedSeconds: { gte: MIN_VIEW_SECONDS } };
  const now = Date.now();
  const since = new Date(now - 30 * DAY); // início da série diária

  const [agg, completedCount, viewers, deviceRows, dailyRows] = await Promise.all([
    db.viewSession.aggregate({
      where,
      _count: { _all: true },
      _sum: { watchedSeconds: true },
    }),
    db.viewSession.count({ where: { ...where, completed: true } }),
    db.viewSession.findMany({ where, distinct: ["userId"], select: { userId: true } }),
    db.viewSession.groupBy({ by: ["device"], where, _count: { _all: true } }),
    // série diária (UTC, igual a dayKey): 1 linha por dia com contagem
    db.$queryRaw<{ day: string; n: number }[]>`
      SELECT to_char(date_trunc('day', "startedAt"), 'YYYY-MM-DD') AS day,
             count(*)::int AS n
      FROM "ViewSession"
      WHERE "videoId" = ${videoId}
        AND "watchedSeconds" >= ${MIN_VIEW_SECONDS}
        AND ("startedAt" AT TIME ZONE 'UTC') >= ${since}
      GROUP BY 1
    `,
  ]);

  const views = agg._count._all;
  const totalWatched = agg._sum.watchedSeconds ?? 0;

  const counts = new Map(dailyRows.map((r) => [r.day, Number(r.n)]));
  const daily: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(new Date(now - i * DAY));
    daily.push({ label: shortLabel(key), value: counts.get(key) ?? 0 });
  }

  return {
    views,
    distinctViewers: viewers.length,
    totalWatchedSec: totalWatched,
    avgWatchedSec: views ? Math.round(totalWatched / views) : 0,
    completionRate: views ? completedCount / views : 0,
    daily,
    devices: deviceRows
      .map((d) => ({ device: d.device, count: d._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface RetentionData {
  values: number[]; // 100 posições
  raw: { bucket: number; viewers: number }[];
}

export async function videoRetention(videoId: string): Promise<RetentionData> {
  const rows = await db.retention.findMany({
    where: { videoId },
    orderBy: { bucket: "asc" },
    select: { bucket: true, viewers: true },
  });
  const values = new Array<number>(100).fill(0);
  for (const r of rows) if (r.bucket >= 0 && r.bucket < 100) values[r.bucket] = r.viewers;
  return { values, raw: rows };
}

export interface ExpectativaData {
  points: { x: number; y: number }[];
  daysElapsed: number;
  currentViews: number;
  proj7: Projection;
  proj30: Projection;
  peerAverage: number | null; // média dos outros vídeos nos mesmos D dias
}

/** Bloco "Expectativa": projeção por regressão + comparação com pares. */
export async function videoExpectativa(
  videoId: string,
  publishedAt: Date,
): Promise<ExpectativaData> {
  const now = Date.now();
  const daysElapsed = Math.max(0, Math.floor((now - publishedAt.getTime()) / DAY)) + 1;

  const sessions = await db.viewSession.findMany({
    where: { videoId, watchedSeconds: { gte: MIN_VIEW_SECONDS } },
    select: { startedAt: true },
  });

  // acumulado por dia desde a publicação
  const perDay = new Array<number>(daysElapsed).fill(0);
  for (const s of sessions) {
    const idx = Math.floor((s.startedAt.getTime() - publishedAt.getTime()) / DAY);
    if (idx >= 0 && idx < daysElapsed) perDay[idx]! += 1;
  }
  const points: { x: number; y: number }[] = [];
  let cum = 0;
  for (let i = 0; i < daysElapsed; i++) {
    cum += perDay[i]!;
    points.push({ x: i, y: cum });
  }
  const currentViews = cum;

  // comparação com pares: views dos OUTROS vídeos nos primeiros `daysElapsed` dias
  const others = await db.video.findMany({
    where: { status: VideoStatus.PUBLISHED, id: { not: videoId }, publishedAt: { not: null } },
    select: { id: true, publishedAt: true },
  });
  const peerViews: number[] = [];
  for (const o of others) {
    if (!o.publishedAt) continue;
    const cutoff = new Date(o.publishedAt.getTime() + daysElapsed * DAY);
    const n = await db.viewSession.count({
      where: {
        videoId: o.id,
        watchedSeconds: { gte: MIN_VIEW_SECONDS },
        startedAt: { lte: cutoff },
      },
    });
    peerViews.push(n);
  }
  const peerAverage =
    peerViews.length > 0
      ? Math.round(peerViews.reduce((a, b) => a + b, 0) / peerViews.length)
      : null;

  return {
    points,
    daysElapsed,
    currentViews,
    proj7: projectCumulative(points, 7),
    proj30: projectCumulative(points, 30),
    peerAverage,
  };
}

export interface DashboardKpis {
  views: number;
  watchedSec: number;
  completionRate: number;
  distinctViewers: number;
}
export interface DashboardData {
  current: DashboardKpis;
  previous: DashboardKpis;
  videos: {
    id: string;
    title: string;
    status: VideoStatus;
    views: number;
    sparkline: number[];
  }[];
}

/** KPIs do painel para um período (com período anterior para variação). */
export async function dashboardStats(periodDays: number): Promise<DashboardData> {
  const now = Date.now();
  const start = new Date(now - periodDays * DAY);
  const prevStart = new Date(now - 2 * periodDays * DAY);

  // Uma varredura só de [prevStart, now): KPIs dos DOIS períodos (atual e
  // anterior), incluindo count(distinct userId) — tudo no banco, sem puxar
  // linha nenhuma para o JS.
  const kpiRows = await db.$queryRaw<
    {
      is_current: boolean;
      views: bigint;
      watched: bigint | null;
      completed: bigint;
      viewers: bigint;
    }[]
  >`
    SELECT (("startedAt" AT TIME ZONE 'UTC') >= ${start}) AS is_current,
           count(*) AS views,
           sum("watchedSeconds") AS watched,
           count(*) FILTER (WHERE "completed") AS completed,
           count(DISTINCT "userId") AS viewers
    FROM "ViewSession"
    WHERE ("startedAt" AT TIME ZONE 'UTC') >= ${prevStart}
      AND "watchedSeconds" >= ${MIN_VIEW_SECONDS}
    GROUP BY 1
  `;
  const toKpis = (cur: boolean): DashboardKpis => {
    const r = kpiRows.find((x) => x.is_current === cur);
    const views = r ? Number(r.views) : 0;
    return {
      views,
      watchedSec: r ? Number(r.watched ?? 0) : 0,
      completionRate: r && views ? Number(r.completed) / views : 0,
      distinctViewers: r ? Number(r.viewers) : 0,
    };
  };

  // Uma varredura do período atual: views por vídeo E por dia (sparkline),
  // como (videoId, índice-de-dia, contagem).
  const sparkRows = await db.$queryRaw<
    { videoId: string; dayIdx: number; n: number }[]
  >`
    SELECT "videoId",
           floor(extract(epoch from (("startedAt" AT TIME ZONE 'UTC') - ${start})) / 86400)::int AS "dayIdx",
           count(*)::int AS n
    FROM "ViewSession"
    WHERE ("startedAt" AT TIME ZONE 'UTC') >= ${start}
      AND "watchedSeconds" >= ${MIN_VIEW_SECONDS}
    GROUP BY 1, 2
  `;

  const videos = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });

  const viewsByVideo = new Map<string, number>();
  const sparkByVideo = new Map<string, number[]>();
  for (const r of sparkRows) {
    const n = Number(r.n);
    viewsByVideo.set(r.videoId, (viewsByVideo.get(r.videoId) ?? 0) + n);
    let arr = sparkByVideo.get(r.videoId);
    if (!arr) {
      arr = new Array<number>(periodDays).fill(0);
      sparkByVideo.set(r.videoId, arr);
    }
    const idx = Number(r.dayIdx);
    if (idx >= 0 && idx < periodDays) arr[idx] = n;
  }

  const table = videos.map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    views: viewsByVideo.get(v.id) ?? 0,
    sparkline: sparkByVideo.get(v.id) ?? new Array<number>(periodDays).fill(0),
  }));

  return { current: toKpis(true), previous: toKpis(false), videos: table };
}
