import { type NextRequest, NextResponse } from "next/server";
import { aggregateRetention } from "@/lib/telemetry/aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Job diário de agregação de retenção (SPEC §6.3, decisão #7: Vercel + Cron).
// Protegido por CRON_SECRET quando definido; em dev sem segredo, liberado.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Não autorizado", { status: 401 });
    }
  }

  const result = await aggregateRetention();
  return NextResponse.json({ ok: true, ...result });
}
