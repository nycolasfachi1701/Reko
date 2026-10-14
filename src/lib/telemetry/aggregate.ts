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
interface SessionMaxRow {
  videoId: string;
  durationSec: number;
  maxPos: number;
}

export async function aggregateRetention(
  now: Date = new Date(),
): Promise<AggregateResult> {
  const videos = await db.video.findMany({
    select: { id: true, durationSec: true },
  });

  // Uma única varredura agregada: a posição MÁXIMA por sessão, direto no banco.
  // Antes era 1 findMany de TODOS os heartbeats por vídeo (N+1 + carga ilimitada
  // em memória). Agora só volta uma linha por sessão. Como o bucket é monotônico
  // na posição, o bucket máximo da sessão = bucket(posição máxima).
  const sessionMax = await db.$queryRaw<SessionMaxRow[]>`
    SELECT vs."videoId"        AS "videoId",
           v."durationSec"     AS "durationSec",
           MAX(h."positionSec") AS "maxPos"
    FROM "Heartbeat" h
    JOIN "ViewSession" vs ON vs."id" = h."viewSessionId"
    JOIN "Video" v        ON v."id" = vs."videoId"
    WHERE v."durationSec" > 0
    GROUP BY vs."videoId", v."durationSec", vs."id"
  `;

  // bucket (0..99) de cada sessão, agrupado por vídeo
  const bucketsByVideo = new Map<string, number[]>();
  for (const r of sessionMax) {
    const duration = Number(r.durationSec);
    if (duration <= 0) continue;
    const bucket = Math.min(
      99,
      Math.max(0, Math.floor((Number(r.maxPos) / duration) * 100)),
    );
    const arr = bucketsByVideo.get(r.videoId);
    if (arr) arr.push(bucket);
    else bucketsByVideo.set(r.videoId, [bucket]);
  }

  let bucketRows = 0;

  for (const video of videos) {
    if (video.durationSec <= 0) continue;

    const buckets = bucketsByVideo.get(video.id);
    if (!buckets || buckets.length === 0) {
      await db.retention.deleteMany({ where: { videoId: video.id } });
      continue;
    }

    // Curva monotônica via soma de sufixo: viewers[b] = nº de sessões cujo
    // bucket máximo é >= b. Histograma + suffix-sum = O(sessões + buckets),
    // em vez do filtro O(100 × sessões) de antes.
    const highest = buckets.reduce((m, v) => Math.max(m, v), 0);
    const hist = new Array<number>(highest + 1).fill(0);
    for (const b of buckets) hist[b] = (hist[b] ?? 0) + 1;

    const rows = new Array<{ videoId: string; bucket: number; viewers: number }>(
      highest + 1,
    );
    let suffix = 0;
    for (let b = highest; b >= 0; b--) {
      suffix += hist[b]!;
      rows[b] = { videoId: video.id, bucket: b, viewers: suffix };
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
