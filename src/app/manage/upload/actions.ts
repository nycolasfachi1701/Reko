"use server";

import { randomUUID } from "node:crypto";
import { Role, VideoStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import {
  getStorage,
  buildKey,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/storage";
import { transcodeToHls } from "@/lib/transcode/hls";

export interface PreparedUpload {
  id: string;
  videoKey: string;
  videoUploadUrl: string;
  thumbKey: string;
  thumbUploadUrl: string;
}

/** Passo 1: cria as URLs de upload (vídeo + thumbnail) para o cliente enviar. */
export async function prepareUpload(input: {
  contentType: string;
}): Promise<PreparedUpload> {
  await requireRole([Role.MANAGER, Role.ADMIN]);

  if (!ALLOWED_VIDEO_TYPES.includes(input.contentType)) {
    throw new Error("Formato de vídeo não suportado (use mp4, mov ou webm).");
  }

  const id = randomUUID();
  const storage = getStorage();
  const videoKey = buildKey("videos", id, input.contentType);
  const thumbKey = buildKey("thumbs", id, "image/jpeg");

  const [video, thumb] = await Promise.all([
    storage.createUploadTarget(videoKey, input.contentType),
    storage.createUploadTarget(thumbKey, "image/jpeg"),
  ]);

  return {
    id,
    videoKey,
    videoUploadUrl: video.uploadUrl,
    thumbKey,
    thumbUploadUrl: thumb.uploadUrl,
  };
}

export interface FinalizeInput {
  videoKey: string;
  thumbKey: string | null;
  durationSec: number;
  title: string;
  description: string;
  tags: string[];
  targetViews: number | null;
  expectedCompletionRate: number | null;
  publish: boolean;
}

/** Passo 2: cria o registro do vídeo depois que os bytes já subiram. */
export async function finalizeVideo(
  input: FinalizeInput,
): Promise<{ id: string }> {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const storage = getStorage();

  const title = input.title.trim();
  if (title.length < 2) throw new Error("Informe um título.");

  const tags = Array.from(
    new Set(
      input.tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);

  const canTranscode = process.env.STORAGE_DRIVER !== "r2";
  const finalStatus = input.publish
    ? VideoStatus.PUBLISHED
    : VideoStatus.DRAFT;

  const video = await db.video.create({
    data: {
      title,
      description: input.description.trim(),
      storageKey: input.videoKey,
      thumbnailUrl: input.thumbKey ? storage.playbackUrl(input.thumbKey) : null,
      durationSec: Math.max(0, Math.round(input.durationSec)),
      // Enquanto transcodifica fica PROCESSING; sem transcode vai direto.
      status: canTranscode ? VideoStatus.PROCESSING : finalStatus,
      publishedAt: canTranscode ? null : input.publish ? new Date() : null,
      uploadedById: user.id,
      targetViews: input.targetViews ?? null,
      expectedCompletionRate: input.expectedCompletionRate ?? null,
      tags: { create: tags.map((tag) => ({ tag })) },
    },
  });

  if (canTranscode) {
    // Transcodifica em background após a resposta (dev). Em prod: worker/fila.
    after(async () => {
      try {
        const hlsKey = await transcodeToHls(video.id, input.videoKey);
        await db.video.update({
          where: { id: video.id },
          data: {
            hlsKey,
            status: finalStatus,
            publishedAt: input.publish ? new Date() : null,
          },
        });
      } catch (err) {
        console.error(`Transcodificação falhou (${video.id}):`, err);
        // Fallback: publica/rascunha com o mp4 original (sem HLS).
        await db.video.update({
          where: { id: video.id },
          data: {
            status: finalStatus,
            publishedAt: input.publish ? new Date() : null,
          },
        });
      }
      // Ao concluir (com ou sem HLS), se publicou, atualiza o feed cacheado.
      if (input.publish) {
        revalidateTag("feed");
        revalidatePath("/manage/videos");
      }
    });
  }

  revalidatePath("/manage/videos");
  // Sem transcode o vídeo já nasce no status final; se publicado, invalida o feed.
  if (!canTranscode && input.publish) revalidateTag("feed");
  return { id: video.id };
}
