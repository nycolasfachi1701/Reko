"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request-ip";

// Hash argon2id fixo, usado quando o e-mail não existe: mantém o tempo de
// resposta constante e não revela se a conta existe (SPEC §4.2).
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$KSQinmTdaw7OkV4uRA4Wng$8UKEaMmJl3Oep07D3RsUKkmx4caSwAgKc8pf0ZyUKS8";

const GENERIC_ERROR = "E-mail ou senha incorretos.";

export interface LoginState {
  error?: string;
}

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // evita open redirect: só caminhos internos da área de gestão
  return value.startsWith("/manage") ? value : "/manage";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  // Rate limit por e-mail (SPEC §4.2 — 5 tentativas / 15 min).
  const limit = rateLimit(`login:${email}`, 5, 15 * 60);
  if (!limit.ok) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(
        limit.retryAfterSec / 60,
      )} min.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });
  const isManager =
    user?.role === Role.MANAGER || user?.role === Role.ADMIN;

  // Sempre roda uma verificação (real ou dummy) para equalizar o tempo.
  const ok = await verifyPassword(
    user?.passwordHash && isManager ? user.passwordHash : DUMMY_HASH,
    password,
  );

  if (!user || !isManager || !user.passwordHash || !ok) {
    return { error: GENERIC_ERROR };
  }

  const headerStore = await headers();
  await createSession(user, {
    userAgent: headerStore.get("user-agent") ?? "",
    ip: getClientIp(headerStore),
  });

  redirect(next);
}
