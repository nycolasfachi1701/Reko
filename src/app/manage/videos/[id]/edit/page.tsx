import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { ManageHeader } from "../../../manage-header";
import { EditVideoForm } from "./edit-form";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const { id } = await params;

  const video = await db.video.findUnique({
    where: { id },
    include: { tags: true },
  });
  if (!video) notFound();

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/manage/videos"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar aos vídeos
        </Link>
        <h1 className="mb-8 mt-4 text-2xl font-bold">Editar vídeo</h1>
        <Card className="p-6">
          <EditVideoForm
            id={video.id}
            initial={{
              title: video.title,
              description: video.description,
              tags: video.tags.map((t) => t.tag).join(", "),
              targetViews: video.targetViews?.toString() ?? "",
              completion:
                video.expectedCompletionRate != null
                  ? Math.round(video.expectedCompletionRate * 100).toString()
                  : "",
            }}
          />
        </Card>
      </main>
    </>
  );
}
