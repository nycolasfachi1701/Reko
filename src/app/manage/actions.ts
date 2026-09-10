"use server";

import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { destroyCurrentSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/require-role";
import { hashPassword } from "@/lib/auth/password";

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export interface CreateUserState {
  ok?: string;
  error?: string;
}

const ROLES = [Role.VIEWER, Role.MANAGER, Role.ADMIN];

/** Admin cria um usuário com e-mail e senha (SPEC §3 — criação de usuários). */
export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireRole([Role.ADMIN]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "VIEWER");
  const role = (ROLES as string[]).includes(roleRaw)
    ? (roleRaw as Role)
    : Role.VIEWER;

  if (name.length < 2) return { error: "Informe o nome." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }

  try {
    await db.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Já existe um usuário com esse e-mail." };
    }
    throw e;
  }

  return { ok: `Usuário ${name} criado.` };
}
