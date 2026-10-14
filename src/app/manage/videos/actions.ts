"use server";

import { rm, unlink, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, dirname } from "node:path";
import { Role, VideoStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import { resolveKeyPath } from "@/lib/storage/local-fs";

async function assertManager() {
  return requireRole([Role.MANAGER, Role.ADMIN]);
}

// Atualiza a listagem de gestão e invalida o cache do feed do espectador.
// O revalidateTag roda em after() (pós-resposta): invalidar tag faz I/O em
// .next/cache que pode travar a action; assim a UI não fica pendurada.
function revalidateCatalog(): void {
  revalidatePath("/manage/videos");
  // revalidateTag em after() (pós-resposta): a listagem de gestão já é
  // force-dynamic, então a UI atualiza pelo router.refresh; o feed e os cards
  // de trilha (que guardam os videoIds) são invalidados em background.
  after(() => {
    revalidateTag("feed");
    revalidateTag("tracks");
  });
}

export async function publishVideo(id: string): Promise<void> {
  await assertManager();
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return;
  await db.video.update({
    where: { id },
    data: {
      status: VideoStatus.PUBLISHED,
      publishedAt: video.publishedAt ?? new Date(),
    },
  });
  revalidateCatalog();
}

export async function archiveVideo(id: string): Promise<void> {
  await assertManager();
  await db.video.update({
    where: { id },
    data: { status: VideoStatus.ARCHIVED },
  });
  revalidateCatalog();
}

export async function deleteVideo(id: string): Promise<void> {
  await assertManager();
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return;

  await db.video.delete({ where: { id } });
  revalidateTag("feed");
  revalidateTag("tracks"); // o vídeo pode estar em trilhas (TrackItem em cascata)

  // Remove os arquivos locais (best-effort). Em R2 isso seria feito no driver.
  if (process.env.STORAGE_DRIVER !== "r2") {
    const stem = basename(video.storageKey, extname(video.storageKey));
    const keys = [video.storageKey, `thumbs/${stem}.jpg`];
    await Promise.all(
      keys.map((k) => unlink(resolveKeyPath(k)).catch(() => {})),
    );
    // pasta HLS transcodificada
    await rm(resolveKeyPath(`hls/${id}`), { recursive: true, force: true }).catch(
      () => {},
    );
  }

  revalidatePath("/manage/videos");
}

const MAX_VTT_BYTES = 2 * 1024 * 1024; // 2 MB

// Envia/atualiza as legendas (.vtt) de um vídeo. O conteúdo chega como texto
// (lido do arquivo no cliente) e é gravado no storage em captions/<id>.vtt.
export async function uploadCaptions(videoId: string, vtt: string): Promise<void> {
  await assertManager();
  if (process.env.STORAGE_DRIVER === "r2") {
    throw new Error("Upload de legendas ainda não suportado no R2.");
  }
  const head = vtt.replace(/^﻿/, "").trimStart();
  if (!head.startsWith("WEBVTT")) {
    throw new Error("Arquivo inválido: use um .vtt (deve começar com WEBVTT).");
  }
  if (Buffer.byteLength(vtt, "utf8") > MAX_VTT_BYTES) {
    throw new Error("Legenda muito grande (máx. 2 MB).");
  }

  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { id: true },
  });
  if (!video) throw new Error("Vídeo não encontrado.");

  const key = `captions/${videoId}.vtt`;
  const path = resolveKeyPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, vtt, "utf8");

  await db.video.update({ where: { id: videoId }, data: { captionsKey: key } });
  revalidatePath(`/manage/videos/${videoId}/edit`);
  revalidatePath(`/v/${videoId}`);
}

export async function removeCaptions(videoId: string): Promise<void> {
  await assertManager();
  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { captionsKey: true },
  });
  if (!video?.captionsKey) return;
  if (process.env.STORAGE_DRIVER !== "r2") {
    await unlink(resolveKeyPath(video.captionsKey)).catch(() => {});
  }
  await db.video.update({ where: { id: videoId }, data: { captionsKey: null } });
  revalidatePath(`/manage/videos/${videoId}/edit`);
  revalidatePath(`/v/${videoId}`);
}

export interface UpdateVideoInput {
  id: string;
  title: string;
  description: string;
  tags: string[];
  targetViews: number | null;
  expectedCompletionRate: number | null;
}

export async function updateVideo(input: UpdateVideoInput): Promise<void> {
  await assertManager();

  const title = input.title.trim();
  if (title.length < 2) throw new Error("Informe um título.");

  const tags = Array.from(
    new Set(
      input.tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);

  await db.$transaction([
    db.video.update({
      where: { id: input.id },
      data: {
        title,
        description: input.description.trim(),
        targetViews: input.targetViews,
        expectedCompletionRate: input.expectedCompletionRate,
      },
    }),
    db.videoTag.deleteMany({ where: { videoId: input.id } }),
    db.videoTag.createMany({
      data: tags.map((tag) => ({ videoId: input.id, tag })),
    }),
  ]);

  revalidatePath("/manage/videos");
  revalidatePath(`/manage/videos/${input.id}/edit`);
  revalidateTag("feed");
}
