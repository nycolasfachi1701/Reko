import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { ManageHeader } from "../../manage-header";
import { TrackEditor } from "./track-editor";
import { TrackAssignments } from "./track-assignments";

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

  // --- atribuições + progresso por usuário ---
  const trackVideoIds = [
    ...track.modules.flatMap((m) => m.items.map((i) => i.videoId)),
    ...track.items.map((i) => i.videoId),
  ];
  const totalVideos = trackVideoIds.length;

  const [assignments, allUsers] = await Promise.all([
    db.trackAssignment.findMany({
      where: { trackId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        dueDate: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  const assigneeIds = assignments.map((a) => a.user.id);
  const doneRows =
    assigneeIds.length > 0 && totalVideos > 0
      ? await db.viewSession.findMany({
          where: { userId: { in: assigneeIds }, completed: true, videoId: { in: trackVideoIds } },
          select: { userId: true, videoId: true },
          distinct: ["userId", "videoId"],
        })
      : [];
  const doneByUser = new Map<string, number>();
  for (const r of doneRows) doneByUser.set(r.userId, (doneByUser.get(r.userId) ?? 0) + 1);

  const assignedIds = new Set(assigneeIds);

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

        <TrackAssignments
          trackId={track.id}
          totalVideos={totalVideos}
          assignees={assignments.map((a) => ({
            id: a.id,
            name: a.user.name,
            email: a.user.email,
            dueDate: a.dueDate ? a.dueDate.toISOString() : null,
            completed: doneByUser.get(a.user.id) ?? 0,
          }))}
          availableUsers={allUsers
            .filter((u) => !assignedIds.has(u.id))
            .map((u) => ({ id: u.id, name: u.name, email: u.email }))}
        />
      </main>
    </>
  );
}
