import { type NextRequest, NextResponse } from "next/server";
import { Role, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { deviceFromUA } from "@/lib/telemetry/device";

export const dynamic = "force-dynamic";

// Cria um ViewSession por abertura de vídeo (SPEC §6.3).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* corpo ausente/ inválido */
  }

  const videoId = String(body.videoId ?? "");
  if (!videoId) return new Response("videoId ausente", { status: 400 });

  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { status: true },
  });
  if (!video) return new Response("Vídeo não encontrado", { status: 404 });
  // só registra view de vídeo publicado (gestor pode registrar em preview)
  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (video.status !== VideoStatus.PUBLISHED && !isManager) {
    return new Response("Vídeo indisponível", { status: 404 });
  }

  const referrer =
    typeof body.referrer === "string" && body.referrer
      ? body.referrer.slice(0, 512)
      : null;

  const session = await db.viewSession.create({
    data: {
      videoId,
      userId: user.id,
      device: deviceFromUA(req.headers.get("user-agent")),
      referrer,
    },
    select: { id: true },
  });

  return NextResponse.json({ sessionId: session.id });
}
