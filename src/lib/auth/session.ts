import "server-only";
import { cookies } from "next/headers";
import { Role, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp, randomToken, sha256Hex } from "./crypto";
import { sign, verifySignature } from "./signing";
import { DAY_SECONDS, HOUR_SECONDS, SESSION_COOKIE } from "./constants";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado");
  return secret;
}

function ttlSecondsForRole(role: Role): number {
  if (role === Role.VIEWER) {
    return Number(process.env.VIEWER_SESSION_TTL_DAYS ?? 30) * DAY_SECONDS;
  }
  return Number(process.env.MANAGER_SESSION_TTL_HOURS ?? 12) * HOUR_SECONDS;
}

/**
 * Cria a sessão: gera token aleatório, guarda só o hash no banco, e grava o
 * cookie httpOnly + assinado. Funciona em Server Actions e Route Handlers.
 */
export async function createSession(
  user: User,
  ctx: { userAgent: string; ip: string },
): Promise<void> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const ttl = ttlSecondsForRole(user.role);
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: ctx.userAgent.slice(0, 512),
      ipHash: hashIp(ctx.ip),
    },
  });

  const signature = await sign(token, sessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

async function readValidatedToken(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const token = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!(await verifySignature(token, signature, sessionSecret()))) return null;
  return token;
}

/**
 * Usuário autenticado a partir do cookie (ou null). Read-first: valida
 * assinatura → busca sessão por hash → checa expiração. Em atividade,
 * atualiza lastSeenAt e faz sliding renewal (SPEC §4.2), no máx. 1x/min.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await readValidatedToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const lastSeen = session.user.lastSeenAt?.getTime() ?? 0;
  if (now - lastSeen > 60_000) {
    const ttl = ttlSecondsForRole(session.user.role);
    await db
      .$transaction([
        db.user.update({
          where: { id: session.userId },
          data: { lastSeenAt: new Date(now) },
        }),
        db.session.update({
          where: { id: session.id },
          data: { expiresAt: new Date(now + ttl * 1000) },
        }),
      ])
      .catch(() => {});
  }

  return session.user;
}

/** Encerra a sessão atual: remove do banco e limpa o cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const token = await readValidatedToken();
  const store = await cookies();
  if (token) {
    await db.session
      .delete({ where: { tokenHash: sha256Hex(token) } })
      .catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}
