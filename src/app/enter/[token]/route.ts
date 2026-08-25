import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request-ip";

// AutoLogin por link (SPEC §4.1). O token NUNCA é logado nem aparece em
// mensagem de erro. Sucesso → 302 para "/" (tira o token da barra/histórico).

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const expired = (motivo?: string) => {
    const url = new URL("/enter/expirado", req.url);
    if (motivo) url.searchParams.set("motivo", motivo);
    return NextResponse.redirect(url, 302);
  };

  const ip = getClientIp(req.headers);

  // Rate limit por IP: 10 tentativas / 10 min.
  const limit = rateLimit(`enter:${ip}`, 10, 10 * 60);
  if (!limit.ok) return expired("limite");

  const { token } = await params;
  if (!token || token.length < 16) return expired();

  const tokenHash = sha256Hex(token);
  const accessToken = await db.accessToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!accessToken) return expired();
  if (accessToken.expiresAt.getTime() < Date.now()) return expired();

  // Uso único, de forma atômica: só cria a sessão se conseguirmos "reivindicar"
  // o token (usedAt ainda null). Evita corrida entre dois cliques simultâneos.
  const claimed = await db.accessToken.updateMany({
    where: { id: accessToken.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return expired();

  await createSession(accessToken.user, {
    userAgent: req.headers.get("user-agent") ?? "",
    ip,
  });

  return NextResponse.redirect(new URL("/", req.url), 302);
}
