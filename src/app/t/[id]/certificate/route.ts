import { NextResponse, type NextRequest } from "next/server";
import { Role, TrackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { completedAmong } from "@/lib/tracks-progress";
import { buildCertificatePdf } from "@/lib/certificate";

export const dynamic = "force-dynamic";

// GET /t/:id/certificate — emite o certificado em PDF se o usuário concluiu
// todos os vídeos da trilha. Caso contrário, volta para a página da trilha.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/t/${id}`, _req.nextUrl.origin),
    );
  }

  const track = await db.track.findUnique({
    where: { id },
    select: {
      title: true,
      status: true,
      modules: { select: { items: { select: { videoId: true } } } },
      items: { where: { moduleId: null }, select: { videoId: true } },
    },
  });
  if (!track) return new NextResponse("Trilha não encontrada", { status: 404 });

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (track.status !== TrackStatus.PUBLISHED && !isManager) {
    return new NextResponse("Trilha não encontrada", { status: 404 });
  }

  const videoIds = [
    ...track.modules.flatMap((m) => m.items.map((i) => i.videoId)),
    ...track.items.map((i) => i.videoId),
  ];
  const total = videoIds.length;
  const completed = await completedAmong(user.id, videoIds);

  // Só emite se concluiu tudo; senão redireciona (evita certificado vazio).
  if (total === 0 || completed.size < total) {
    return NextResponse.redirect(new URL(`/t/${id}`, _req.nextUrl.origin));
  }

  // Data de conclusão = atividade mais recente entre as sessões concluídas.
  const last = await db.viewSession.findFirst({
    where: { userId: user.id, completed: true, videoId: { in: videoIds } },
    orderBy: { lastBeatAt: "desc" },
    select: { lastBeatAt: true },
  });

  const pdf = await buildCertificatePdf({
    userName: user.name,
    trackTitle: track.title,
    completedAt: last?.lastBeatAt ?? new Date(),
    videoCount: total,
  });

  const slug =
    track.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "trilha";

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
