"use server";

import { randomUUID } from "node:crypto";
import { Role, VideoStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import {
  getStorage,
  buildKey,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/storage";

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

  const video = await db.video.create({
    data: {
      title,
      description: input.description.trim(),
      storageKey: input.videoKey,
      thumbnailUrl: input.thumbKey ? storage.playbackUrl(input.thumbKey) : null,
      durationSec: Math.max(0, Math.round(input.durationSec)),
      status: input.publish ? VideoStatus.PUBLISHED : VideoStatus.DRAFT,
      publishedAt: input.publish ? new Date() : null,
      uploadedById: user.id,
      targetViews: input.targetViews ?? null,
      expectedCompletionRate: input.expectedCompletionRate ?? null,
      tags: { create: tags.map((tag) => ({ tag })) },
    },
  });

  revalidatePath("/manage/videos");
  return { id: video.id };
}
