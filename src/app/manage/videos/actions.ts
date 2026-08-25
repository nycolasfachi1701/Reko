"use server";

import { rm, unlink } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Role, VideoStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import { resolveKeyPath } from "@/lib/storage/local-fs";

async function assertManager() {
  return requireRole([Role.MANAGER, Role.ADMIN]);
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
  revalidatePath("/manage/videos");
}

export async function archiveVideo(id: string): Promise<void> {
  await assertManager();
  await db.video.update({
    where: { id },
    data: { status: VideoStatus.ARCHIVED },
  });
  revalidatePath("/manage/videos");
}

export async function deleteVideo(id: string): Promise<void> {
  await assertManager();
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return;

  await db.video.delete({ where: { id } });

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
}
