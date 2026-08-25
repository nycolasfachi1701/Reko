"use server";

import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { destroyCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/require-role";
import { createAccessToken, accessLink } from "@/lib/auth/access-token";

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export interface CreateLinkState {
  link?: string;
  expiresAt?: string;
  error?: string;
}

/** Admin cria um espectador e gera um link de acesso de uso único (SPEC §4.1). */
export async function createViewerAndLinkAction(
  _prev: CreateLinkState,
  formData: FormData,
): Promise<CreateLinkState> {
  const admin = await requireRole([Role.ADMIN]);

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Informe o nome do espectador." };
  }

  const viewer = await db.user.create({
    data: { name, role: Role.VIEWER },
  });

  const { token, expiresAt } = await createAccessToken(viewer.id, admin.id);

  // O token só existe aqui, uma vez, para montar o link. Nunca é logado.
  return {
    link: accessLink(token),
    expiresAt: expiresAt.toISOString(),
  };
}
