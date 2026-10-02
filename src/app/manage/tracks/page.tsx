import Link from "next/link";
import { Role, TrackStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { CreateTrackForm } from "./create-track-form";

const STATUS_LABEL: Record<TrackStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
};

export const dynamic = "force-dynamic";

export default async function TracksPage() {
  await requireRole([Role.MANAGER, Role.ADMIN]);

  const tracks = await db.track.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/manage"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar à gestão
        </Link>

        <h1 className="mb-1 mt-4 font-display text-2xl font-bold">Trilhas</h1>
        <p className="mb-8 text-sm text-fg-lo">
          Agrupe vídeos em cursos, com módulos e ordem. Publique quando estiver pronta.
        </p>

        <Card className="mb-8 p-6">
          <CreateTrackForm />
        </Card>

        {tracks.length === 0 ? (
          <p className="text-sm text-fg-mut">Nenhuma trilha ainda.</p>
        ) : (
          <Card className="divide-y divide-[var(--border)]">
            {tracks.map((t) => (
              <Link
                key={t.id}
                href={`/manage/tracks/${t.id}`}
                className="group flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-fg-mut tabular-nums">
                    {t._count.items} {t._count.items === 1 ? "vídeo" : "vídeos"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-fg-lo">
                    {STATUS_LABEL[t.status]}
                  </span>
                  <span className="text-xs text-fg-mut transition-colors group-hover:text-brand">
                    Editar →
                  </span>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </main>
    </>
  );
}
