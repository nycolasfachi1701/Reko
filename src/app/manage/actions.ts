"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import { hashPassword } from "@/lib/auth/password";

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

  revalidatePath("/manage/access");
  return { ok: `Usuário ${name} criado.` };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface UpdateUserInput {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string; // vazio = mantém a senha atual
}

/** Admin edita um usuário: nome, e-mail, papel e (opcional) redefine a senha. */
export async function updateUser(input: UpdateUserInput): Promise<void> {
  await requireRole([Role.ADMIN]);

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = (ROLES as string[]).includes(input.role) ? input.role : Role.VIEWER;
  const password = input.password ?? "";

  if (name.length < 2) throw new Error("Informe o nome.");
  if (!EMAIL_RE.test(email)) throw new Error("Informe um e-mail válido.");
  if (password && password.length < 8) {
    throw new Error("A nova senha deve ter ao menos 8 caracteres.");
  }

  const target = await db.user.findUnique({
    where: { id: input.id },
    select: { id: true, role: true },
  });
  if (!target) throw new Error("Usuário não encontrado.");

  // Trava de segurança: não deixar o sistema sem nenhum administrador.
  if (target.role === Role.ADMIN && role !== Role.ADMIN) {
    const admins = await db.user.count({ where: { role: Role.ADMIN } });
    if (admins <= 1) {
      throw new Error("Não é possível rebaixar o último administrador.");
    }
  }

  try {
    await db.user.update({
      where: { id: input.id },
      data: {
        name,
        email,
        role,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Já existe um usuário com esse e-mail.");
    }
    throw e;
  }

  revalidatePath("/manage/access");
}
