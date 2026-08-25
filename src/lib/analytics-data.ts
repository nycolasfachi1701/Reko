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
  const sessions = await db.viewSession.findMany({
    where: { videoId },
    select: {
      userId: true,
      startedAt: true,
      watchedSeconds: true,
      completed: true,
      device: true,
    },
  });
  const views = sessions.filter((s) => s.watchedSeconds >= MIN_VIEW_SECONDS);

  const distinct = new Set(views.map((s) => s.userId)).size;
  const totalWatched = views.reduce((a, s) => a + s.watchedSeconds, 0);
  const completedCount = views.filter((s) => s.completed).length;

  // série diária (30 dias)
  const daily: { label: string; value: number }[] = [];
  const now = Date.now();
  const counts = new Map<string, number>();
  for (const s of views) counts.set(dayKey(s.startedAt), (counts.get(dayKey(s.startedAt)) ?? 0) + 1);
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(new Date(now - i * DAY));
    daily.push({ label: shortLabel(key), value: counts.get(key) ?? 0 });
  }

  const deviceMap = new Map<string, number>();
  for (const s of views) deviceMap.set(s.device, (deviceMap.get(s.device) ?? 0) + 1);

  return {
    views: views.length,
    distinctViewers: distinct,
    totalWatchedSec: totalWatched,
    avgWatchedSec: views.length ? Math.round(totalWatched / views.length) : 0,
    completionRate: views.length ? completedCount / views.length : 0,
    daily,
    devices: Array.from(deviceMap, ([device, count]) => ({ device, count })).sort(
      (a, b) => b.count - a.count,
    ),
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

  const sessions = await db.viewSession.findMany({
    where: { startedAt: { gte: prevStart }, watchedSeconds: { gte: MIN_VIEW_SECONDS } },
    select: {
      videoId: true,
      userId: true,
      startedAt: true,
      watchedSeconds: true,
      completed: true,
    },
  });

  const inCurrent = sessions.filter((s) => s.startedAt >= start);
  const inPrevious = sessions.filter((s) => s.startedAt < start);

  const kpis = (rows: typeof sessions): DashboardKpis => ({
    views: rows.length,
    watchedSec: rows.reduce((a, s) => a + s.watchedSeconds, 0),
    completionRate: rows.length
      ? rows.filter((s) => s.completed).length / rows.length
      : 0,
    distinctViewers: new Set(rows.map((s) => s.userId)).size,
  });

  // tabela de vídeos + sparkline (views/dia no período)
  const videos = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });

  const byVideoDay = new Map<string, Map<number, number>>();
  const viewsByVideo = new Map<string, number>();
  for (const s of inCurrent) {
    viewsByVideo.set(s.videoId, (viewsByVideo.get(s.videoId) ?? 0) + 1);
    const dayIdx = Math.floor((s.startedAt.getTime() - start.getTime()) / DAY);
    let m = byVideoDay.get(s.videoId);
    if (!m) {
      m = new Map();
      byVideoDay.set(s.videoId, m);
    }
    m.set(dayIdx, (m.get(dayIdx) ?? 0) + 1);
  }

  const table = videos.map((v) => {
    const m = byVideoDay.get(v.id);
    const spark: number[] = [];
    for (let i = 0; i < periodDays; i++) spark.push(m?.get(i) ?? 0);
    return {
      id: v.id,
      title: v.title,
      status: v.status,
      views: viewsByVideo.get(v.id) ?? 0,
      sparkline: spark,
    };
  });

  return { current: kpis(inCurrent), previous: kpis(inPrevious), videos: table };
}
