import { type NextRequest, NextResponse } from "next/server";
import { aggregateRetention } from "@/lib/telemetry/aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Job diário de agregação de retenção (SPEC §6.3, decisão #7: Vercel + Cron).
// Protegido por CRON_SECRET. Em produção o segredo é obrigatório (fail-closed):
// sem ele, qualquer um dispararia o job (carga de CPU/DB). Em dev, liberado.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return new Response("CRON_SECRET não configurado", { status: 503 });
    }
    // dev sem segredo: liberado
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Não autorizado", { status: 401 });
    }
  }

  const result = await aggregateRetention();
  return NextResponse.json({ ok: true, ...result });
}
