import "server-only";
import { db } from "@/lib/db";
import { randomToken, sha256Hex } from "./crypto";
import { DAY_SECONDS } from "./constants";

export function accessTokenTtlDays(): number {
  return Number(process.env.ACCESS_TOKEN_TTL_DAYS ?? 7);
}

/**
 * Gera um AccessToken de uso único para um espectador (SPEC §4.1).
 * Retorna o token em TEXTO PURO apenas uma vez, para montar o link —
 * no banco guardamos só o hash SHA-256.
 */
export async function createAccessToken(
  userId: string,
  createdById: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(
    Date.now() + accessTokenTtlDays() * DAY_SECONDS * 1000,
  );

  await db.accessToken.create({
    data: { userId, tokenHash, expiresAt, createdById },
  });

  return { token, expiresAt };
}

/** Monta o link de acesso a partir do token em texto puro. */
export function accessLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/enter/${token}`;
}
