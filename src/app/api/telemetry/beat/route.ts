import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Heartbeat de reprodução (SPEC §6.3): atualiza a sessão e grava o ponto bruto.
// Aceita tanto fetch quanto navigator.sendBeacon (corpo JSON).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? "");
  const positionSec = Math.max(0, Math.floor(Number(body.positionSec ?? 0)));
  // limita o incremento para evitar inflar métrica
  const watchedDelta = Math.max(0, Math.min(120, Math.floor(Number(body.watchedDelta ?? 0))));
  const duration = Math.max(0, Math.floor(Number(body.duration ?? 0)));
  if (!sessionId) return new Response(null, { status: 400 });

  const vs = await db.viewSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, maxPositionSec: true },
  });
  if (!vs || vs.userId !== user.id) return new Response(null, { status: 403 });

  const maxPositionSec = Math.max(vs.maxPositionSec, positionSec);
  const completed = duration > 0 && maxPositionSec >= Math.floor(duration * 0.95);

  await db.$transaction([
    db.viewSession.update({
      where: { id: sessionId },
      data: {
        watchedSeconds: { increment: watchedDelta },
        maxPositionSec,
        lastBeatAt: new Date(),
        completed,
      },
    }),
    db.heartbeat.create({ data: { viewSessionId: sessionId, positionSec } }),
  ]);

  return new Response(null, { status: 204 });
}
