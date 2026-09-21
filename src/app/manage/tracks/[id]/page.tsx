import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { ManageHeader } from "../../manage-header";
import { TrackEditor } from "./track-editor";

export const dynamic = "force-dynamic";

export default async function TrackEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const { id } = await params;

  const track = await db.track.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { video: { select: { id: true, title: true, durationSec: true } } },
          },
        },
      },
      items: {
        where: { moduleId: null },
        orderBy: { order: "asc" },
        include: { video: { select: { id: true, title: true, durationSec: true } } },
      },
    },
  });
  if (!track) notFound();

  const videos = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, durationSec: true },
  });

  type Row = { video: { id: string; title: string; durationSec: number }; id: string; videoId: string };
  const mapItem = (it: Row) => ({
    id: it.id,
    videoId: it.videoId,
    title: it.video.title,
    durationSec: it.video.durationSec,
  });

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/manage/tracks"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar às trilhas
        </Link>
        <TrackEditor
          track={{
            id: track.id,
            title: track.title,
            description: track.description,
            coverUrl: track.coverUrl,
            status: track.status,
            modules: track.modules.map((m) => ({
              id: m.id,
              title: m.title,
              items: m.items.map(mapItem),
            })),
            looseItems: track.items.map(mapItem),
          }}
          videos={videos}
        />
      </main>
    </>
  );
}
