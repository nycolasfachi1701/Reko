import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { Logo } from "@/components/logo";
import { VideoPlayer } from "@/components/player/video-player";
import { formatRelativeTime, formatViews } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { t } = await searchParams;

  const video = await db.video.findUnique({
    where: { id },
    include: {
      tags: true,
      uploadedBy: { select: { name: true } },
    },
  });
  if (!video) notFound();

  const views = await db.viewSession.count({
    where: { videoId: id, watchedSeconds: { gte: 3 } },
  });

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (video.status !== VideoStatus.PUBLISHED && !isManager) notFound();

  const src = getStorage().playbackUrl(video.storageKey);
  const startAt = t ? Math.max(0, Number.parseInt(t, 10) || 0) : 0;
  const publishedAt = video.publishedAt ?? video.createdAt;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo showText={false} />
            <span className="text-sm text-fg-lo">← Voltar aos vídeos</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="lg:sticky lg:top-4">
          <VideoPlayer
            src={src}
            poster={video.thumbnailUrl}
            title={video.title}
            videoId={video.id}
            startAt={startAt}
          />
        </div>

        {video.status !== VideoStatus.PUBLISHED ? (
          <p className="mt-3 inline-block rounded bg-[var(--brand-soft)] px-2 py-1 text-xs text-brand">
            Prévia — este vídeo ainda não está publicado.
          </p>
        ) : null}

        <h1 className="mt-4 text-xl font-bold sm:text-2xl">{video.title}</h1>
        <p className="mt-1 text-sm text-fg-lo tabular-nums">
          {formatViews(views)} · {formatRelativeTime(publishedAt)} ·{" "}
          {video.uploadedBy.name}
        </p>

        {video.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.tags.map((t) => (
              <span
                key={t.tag}
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-fg-lo"
              >
                {t.tag}
              </span>
            ))}
          </div>
        ) : null}

        {video.description ? (
          <div className="mt-4 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-surface-1 p-4 text-sm leading-relaxed text-fg-hi">
            {video.description}
          </div>
        ) : null}
      </main>
    </div>
  );
}
