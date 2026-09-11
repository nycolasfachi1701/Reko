"use server";

import { revalidatePath } from "next/cache";
import { Role, VoteValue } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-role";
import { REACTION_EMOJIS } from "./reactions";

const MAX_COMMENT = 2000;

/** Like/Dislike: um voto por usuário por vídeo; clicar de novo no mesmo remove. */
export async function toggleVote(videoId: string, value: VoteValue): Promise<void> {
  const user = await requireUser();
  const where = { videoId_userId: { videoId, userId: user.id } };

  const existing = await db.vote.findUnique({ where });
  if (existing?.value === value) {
    await db.vote.delete({ where });
  } else {
    await db.vote.upsert({
      where,
      update: { value },
      create: { videoId, userId: user.id, value },
    });
  }
  revalidatePath(`/v/${videoId}`);
}

/** Reação (emoji): cumulativa; clicar de novo remove aquela reação. */
export async function toggleReaction(videoId: string, emoji: string): Promise<void> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("Reação inválida.");
  }
  const user = await requireUser();
  const where = { videoId_userId_emoji: { videoId, userId: user.id, emoji } };

  const existing = await db.reaction.findUnique({ where });
  if (existing) {
    await db.reaction.delete({ where });
  } else {
    await db.reaction.create({ data: { videoId, userId: user.id, emoji } });
  }
  revalidatePath(`/v/${videoId}`);
}

/** Publica um comentário. `parentId` (opcional) responde outro — 1 nível só. */
export async function postComment(
  videoId: string,
  body: string,
  parentId?: string,
): Promise<void> {
  const user = await requireUser();

  const text = body.trim();
  if (text.length === 0) throw new Error("Escreva algo.");
  if (text.length > MAX_COMMENT) {
    throw new Error(`O comentário deve ter até ${MAX_COMMENT} caracteres.`);
  }

  const video = await db.video.findUnique({ where: { id: videoId }, select: { id: true } });
  if (!video) throw new Error("Vídeo não encontrado.");

  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { videoId: true, parentId: true },
    });
    // resposta só a um comentário raiz do mesmo vídeo (mantém 1 nível)
    if (!parent || parent.videoId !== videoId || parent.parentId !== null) {
      throw new Error("Não é possível responder a este comentário.");
    }
  }

  await db.comment.create({
    data: { videoId, userId: user.id, body: text, parentId: parentId ?? null },
  });
  revalidatePath(`/v/${videoId}`);
}

/** Remove um comentário (soft delete). Autor, gestor ou admin. */
export async function deleteComment(commentId: string): Promise<void> {
  const user = await requireUser();

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, videoId: true, userId: true, deletedAt: true },
  });
  if (!comment || comment.deletedAt) return;

  const canModerate = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (comment.userId !== user.id && !canModerate) {
    throw new Error("Sem permissão para remover este comentário.");
  }

  // Soft delete: preserva a árvore de respostas (SPEC §6.2).
  await db.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });
  revalidatePath(`/v/${comment.videoId}`);
}
