import "server-only";
import { db } from "@/lib/db";

/**
 * Progresso em trilhas deriva de ViewSession.completed (≥95% assistido, regra
 * já existente). Um vídeo conta como "feito" para o usuário se ele tem ao menos
 * uma ViewSession concluída dele.
 */

/** Dos `videoIds` dados, quais o usuário já concluiu. */
export async function completedAmong(
  userId: string,
  videoIds: string[],
): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const rows = await db.viewSession.findMany({
    where: { userId, completed: true, videoId: { in: videoIds } },
    select: { videoId: true },
    distinct: ["videoId"],
  });
  return new Set(rows.map((r) => r.videoId));
}
