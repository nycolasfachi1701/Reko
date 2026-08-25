import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDuration } from "@/lib/utils";
import { ManageHeader } from "../manage-header";
import { VideoRowActions } from "./video-row-actions";

export default async function VideosPage() {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);

  const videos = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { viewSessions: true } } },
  });

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vídeos</h1>
            <p className="mt-1 text-sm text-fg-lo">
              {videos.length} {videos.length === 1 ? "vídeo" : "vídeos"}
            </p>
          </div>
          <Link href="/manage/upload">
            <Button>+ Enviar vídeo</Button>
          </Link>
        </div>

        {videos.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-fg-hi">Nenhum vídeo ainda.</p>
            <p className="max-w-sm text-sm text-fg-lo">
              Envie o primeiro vídeo — a miniatura e a duração são geradas
              automaticamente a partir do arquivo.
            </p>
            <Link href="/manage/upload" className="mt-2">
              <Button>+ Enviar vídeo</Button>
            </Link>
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--border)]">
            {videos.map((v) => (
              <div
                key={v.id}
                data-testid={`video-row-${v.id}`}
                className="flex items-center gap-4 p-3 transition-colors hover:bg-surface-2"
              >
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded bg-surface-0">
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-fg-lo">
                      sem capa
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">
                    {formatDuration(v.durationSec)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/manage/videos/${v.id}`}
                      className="truncate font-medium hover:text-brand"
                    >
                      {v.title}
                    </Link>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-fg-lo tabular-nums">
                    {v._count.viewSessions} sessões ·{" "}
                    {v.createdAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <VideoRowActions id={v.id} status={v.status} />
              </div>
            ))}
          </Card>
        )}
      </main>
    </>
  );
}
