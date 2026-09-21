"use server";

import { Prisma, Role, TrackStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";

async function assertManager() {
  return requireRole([Role.MANAGER, Role.ADMIN]);
}

// Atualiza a gestão da trilha e invalida o cache do espectador (tag "tracks").
function revalidateTrack(id: string): void {
  revalidatePath("/manage/tracks");
  revalidatePath(`/manage/tracks/${id}`);
  revalidateTag("tracks");
}

// ----------------------------- Trilha ------------------------------------
export async function createTrack(input: {
  title: string;
  description: string;
}): Promise<{ id: string }> {
  const user = await assertManager();
  const title = input.title.trim();
  if (title.length < 2) throw new Error("Informe um título.");
  const track = await db.track.create({
    data: { title, description: input.description.trim(), createdById: user.id },
  });
  revalidatePath("/manage/tracks");
  return { id: track.id };
}

export async function updateTrack(input: {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
}): Promise<void> {
  await assertManager();
  const title = input.title.trim();
  if (title.length < 2) throw new Error("Informe um título.");
  await db.track.update({
    where: { id: input.id },
    data: {
      title,
      description: input.description.trim(),
      coverUrl: input.coverUrl?.trim() || null,
    },
  });
  revalidateTrack(input.id);
}

export async function publishTrack(id: string): Promise<void> {
  await assertManager();
  const t = await db.track.findUnique({
    where: { id },
    select: { publishedAt: true, _count: { select: { items: true } } },
  });
  if (!t) return;
  if (t._count.items === 0) {
    throw new Error("Adicione ao menos um vídeo antes de publicar.");
  }
  await db.track.update({
    where: { id },
    data: { status: TrackStatus.PUBLISHED, publishedAt: t.publishedAt ?? new Date() },
  });
  revalidateTrack(id);
}

export async function archiveTrack(id: string): Promise<void> {
  await assertManager();
  await db.track.update({ where: { id }, data: { status: TrackStatus.ARCHIVED } });
  revalidateTrack(id);
}

export async function deleteTrack(id: string): Promise<void> {
  await assertManager();
  await db.track.delete({ where: { id } }); // cascade: módulos e itens
  revalidatePath("/manage/tracks");
  revalidateTag("tracks");
}

// ----------------------------- Módulo ------------------------------------
export async function addModule(trackId: string, title: string): Promise<void> {
  await assertManager();
  const t = title.trim();
  if (t.length < 1) throw new Error("Informe o nome do módulo.");
  const max = await db.trackModule.aggregate({
    where: { trackId },
    _max: { order: true },
  });
  await db.trackModule.create({
    data: { trackId, title: t, order: (max._max.order ?? -1) + 1 },
  });
  revalidateTrack(trackId);
}

export async function renameModule(moduleId: string, title: string): Promise<void> {
  await assertManager();
  const t = title.trim();
  if (t.length < 1) throw new Error("Informe o nome do módulo.");
  const m = await db.trackModule.update({
    where: { id: moduleId },
    data: { title: t },
    select: { trackId: true },
  });
  revalidateTrack(m.trackId);
}

export async function deleteModule(moduleId: string): Promise<void> {
  await assertManager();
  // itens do módulo ficam soltos (moduleId → null, via onDelete: SetNull)
  const m = await db.trackModule.delete({
    where: { id: moduleId },
    select: { trackId: true },
  });
  revalidateTrack(m.trackId);
}

export async function moveModule(moduleId: string, dir: "up" | "down"): Promise<void> {
  await assertManager();
  const m = await db.trackModule.findUnique({
    where: { id: moduleId },
    select: { id: true, trackId: true, order: true },
  });
  if (!m) return;
  const neighbor = await db.trackModule.findFirst({
    where: { trackId: m.trackId, order: dir === "up" ? { lt: m.order } : { gt: m.order } },
    orderBy: { order: dir === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbor) return;
  await db.$transaction([
    db.trackModule.update({ where: { id: m.id }, data: { order: neighbor.order } }),
    db.trackModule.update({ where: { id: neighbor.id }, data: { order: m.order } }),
  ]);
  revalidateTrack(m.trackId);
}

// ------------------------------ Item -------------------------------------
export async function addItem(
  trackId: string,
  videoId: string,
  moduleId: string | null,
): Promise<void> {
  await assertManager();
  // ordem = fim do container (módulo específico, ou os soltos quando null)
  const max = await db.trackItem.aggregate({
    where: { trackId, moduleId },
    _max: { order: true },
  });
  try {
    await db.trackItem.create({
      data: { trackId, videoId, moduleId, order: (max._max.order ?? -1) + 1 },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Esse vídeo já está na trilha.");
    }
    throw e;
  }
  revalidateTrack(trackId);
}

export async function removeItem(itemId: string): Promise<void> {
  await assertManager();
  const it = await db.trackItem.delete({
    where: { id: itemId },
    select: { trackId: true },
  });
  revalidateTrack(it.trackId);
}

export async function moveItem(itemId: string, dir: "up" | "down"): Promise<void> {
  await assertManager();
  const it = await db.trackItem.findUnique({
    where: { id: itemId },
    select: { id: true, trackId: true, moduleId: true, order: true },
  });
  if (!it) return;
  const neighbor = await db.trackItem.findFirst({
    where: {
      trackId: it.trackId,
      moduleId: it.moduleId,
      order: dir === "up" ? { lt: it.order } : { gt: it.order },
    },
    orderBy: { order: dir === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbor) return;
  await db.$transaction([
    db.trackItem.update({ where: { id: it.id }, data: { order: neighbor.order } }),
    db.trackItem.update({ where: { id: neighbor.id }, data: { order: it.order } }),
  ]);
  revalidateTrack(it.trackId);
}
