import { db } from "../db";

const HEARTBEAT_RETENTION_DAYS = 90;

export interface AggregateResult {
  videos: number;
  bucketRows: number;
  prunedHeartbeats: number;
}

/**
 * Agrega heartbeats em Retention (100 buckets = fatias de 1% do vídeo) e poda
 * heartbeats com mais de 90 dias (SPEC §5/§6.3).
 *
 * Curva de audiência monotônica: para cada bucket b, `viewers` = nº de sessões
 * que alcançaram pelo menos aquele ponto (bucket máximo do heartbeat da sessão).
 * É o que diz "onde o vídeo perde gente".
 */
export async function aggregateRetention(
  now: Date = new Date(),
): Promise<AggregateResult> {
  const videos = await db.video.findMany({
    select: { id: true, durationSec: true },
  });

  let bucketRows = 0;

  for (const video of videos) {
    if (video.durationSec <= 0) continue;

    const beats = await db.heartbeat.findMany({
      where: { viewSession: { videoId: video.id } },
      select: { positionSec: true, viewSessionId: true },
    });

    if (beats.length === 0) {
      await db.retention.deleteMany({ where: { videoId: video.id } });
      continue;
    }

    // bucket máximo alcançado por cada sessão
    const maxBucketBySession = new Map<string, number>();
    for (const beat of beats) {
      const bucket = Math.min(
        99,
        Math.max(0, Math.floor((beat.positionSec / video.durationSec) * 100)),
      );
      const cur = maxBucketBySession.get(beat.viewSessionId);
      if (cur === undefined || bucket > cur) {
        maxBucketBySession.set(beat.viewSessionId, bucket);
      }
    }

    const reached = Array.from(maxBucketBySession.values());
    const highest = reached.reduce((m, v) => Math.max(m, v), 0);

    const rows = [];
    for (let b = 0; b <= highest; b++) {
      rows.push({
        videoId: video.id,
        bucket: b,
        viewers: reached.filter((m) => m >= b).length,
      });
    }

    await db.$transaction([
      db.retention.deleteMany({ where: { videoId: video.id } }),
      db.retention.createMany({ data: rows }),
    ]);
    bucketRows += rows.length;
  }

  const cutoff = new Date(now.getTime() - HEARTBEAT_RETENTION_DAYS * 86400000);
  const pruned = await db.heartbeat.deleteMany({ where: { at: { lt: cutoff } } });

  return {
    videos: videos.length,
    bucketRows,
    prunedHeartbeats: pruned.count,
  };
}
