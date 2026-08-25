import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  videoDetailStats,
  videoRetention,
  videoExpectativa,
} from "@/lib/analytics-data";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.MANAGER && user.role !== Role.ADMIN)) {
    return new Response("Não autorizado", { status: 403 });
  }

  const { id } = await params;
  const block = new URL(req.url).searchParams.get("block") ?? "visualizacoes";

  const video = await db.video.findUnique({
    where: { id },
    select: { durationSec: true, publishedAt: true, createdAt: true, targetViews: true },
  });
  if (!video) return new Response("Não encontrado", { status: 404 });

  let rows: (string | number)[][] = [];

  if (block === "visualizacoes") {
    const s = await videoDetailStats(id);
    rows = [
      ["Métrica", "Valor"],
      ["Views (>=3s)", s.views],
      ["Espectadores distintos", s.distinctViewers],
      ["Tempo total assistido (s)", s.totalWatchedSec],
      ["Tempo médio assistido (s)", s.avgWatchedSec],
      ["Taxa de conclusão", s.completionRate.toFixed(4)],
      [],
      ["Data", "Views"],
      ...s.daily.map((d) => [d.label, d.value]),
      [],
      ["Dispositivo", "Views"],
      ...s.devices.map((d) => [d.device, d.count]),
    ];
  } else if (block === "percepcao") {
    const ret = await videoRetention(id);
    rows = [
      ["Bucket (%)", "Segundo", "Espectadores"],
      ...ret.values.map((v, i) => [
        i,
        Math.round((i / 100) * video.durationSec),
        v,
      ]),
    ];
  } else if (block === "expectativa") {
    const exp = await videoExpectativa(
      id,
      video.publishedAt ?? video.createdAt,
    );
    rows = [
      ["Métrica", "Valor"],
      ["Views até agora", exp.currentViews],
      ["Projeção 7 dias", exp.proj7.predicted],
      ["Projeção 30 dias (min)", exp.proj30.min],
      ["Projeção 30 dias", exp.proj30.predicted],
      ["Projeção 30 dias (max)", exp.proj30.max],
      ["Meta de views", video.targetViews ?? ""],
      ["Média dos pares", exp.peerAverage ?? ""],
      [],
      ["Dia", "Views acumuladas"],
      ...exp.points.map((p) => [p.x, p.y]),
    ];
  } else {
    return new Response("Bloco inválido", { status: 400 });
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${block}-${id}.csv"`,
    },
  });
}
