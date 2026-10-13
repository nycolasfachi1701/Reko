"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request-ip";

// Hash scrypt fixo, usado quando o e-mail não existe: mantém o tempo de
// resposta constante e não revela se a conta existe (SPEC §4.2).
const DUMMY_HASH =
  "scrypt$16384$996adc9ea93d2dce9b968041aa91c50f$804b4846c8878915a9862fe00a9920ed956266fea919cbb334b0fd4c693e5adaca04c9cb33fa4b32bfba419e62f40c5fc890f908d55cb59b2fe37e85008cd2ee";

const GENERIC_ERROR = "E-mail ou senha incorretos.";

export interface LoginState {
  error?: string;
}

// Destino pós-login por papel; evita open redirect.
function destinationFor(role: Role, next: FormDataEntryValue | null): string {
  if (role === Role.VIEWER) return "/";
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/manage") ? value : "/manage";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  // Balde por e-mail: trava força-bruta numa conta (consome a cada tentativa).
  const byEmail = rateLimit(`login:${email}`, 5, 15 * 60);
  if (!byEmail.ok) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(
        byEmail.retryAfterSec / 60,
      )} min.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Sempre roda uma verificação (real ou dummy) para equalizar o tempo.
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !user.passwordHash || !ok) {
    // Balde por IP consumido só em FALHAS: trava password spraying (1 senha em
    // muitas contas do mesmo IP) sem penalizar logins bem-sucedidos de um
    // escritório atrás de um único IP (NAT).
    const byIp = rateLimit(`login-ip:${ip}`, 50, 15 * 60);
    if (!byIp.ok) {
      return {
        error: `Muitas tentativas. Tente novamente em ${Math.ceil(
          byIp.retryAfterSec / 60,
        )} min.`,
      };
    }
    return { error: GENERIC_ERROR };
  }

  await createSession(user, {
    userAgent: headerStore.get("user-agent") ?? "",
    ip,
  });

  redirect(destinationFor(user.role, formData.get("next")));
}
