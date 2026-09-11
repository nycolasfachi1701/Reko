import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { videoRetention } from "@/lib/analytics-data";
import { Logo } from "@/components/logo";
import { VideoPlayer } from "@/components/player/video-player";
import { formatRelativeTime, formatViews } from "@/lib/format";
import { REACTION_EMOJIS } from "./reactions";
import { VideoInteractions } from "./video-interactions";
import { CommentsSection, type CommentView } from "./comments-section";

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

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (video.status !== VideoStatus.PUBLISHED && !isManager) notFound();

  const [views, likeCount, dislikeCount, myVote, reactionGroups, myReactions] =
    await Promise.all([
      db.viewSession.count({ where: { videoId: id, watchedSeconds: { gte: 3 } } }),
      db.vote.count({ where: { videoId: id, value: "LIKE" } }),
      db.vote.count({ where: { videoId: id, value: "DISLIKE" } }),
      db.vote.findUnique({
        where: { videoId_userId: { videoId: id, userId: user.id } },
        select: { value: true },
      }),
      db.reaction.groupBy({
        by: ["emoji"],
        where: { videoId: id },
        _count: { _all: true },
      }),
      db.reaction.findMany({
        where: { videoId: id, userId: user.id },
        select: { emoji: true },
      }),
    ]);

  const reactionCounts = new Map(reactionGroups.map((g) => [g.emoji, g._count._all]));
  const mineSet = new Set(myReactions.map((r) => r.emoji));
  const reactions = REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: reactionCounts.get(emoji) ?? 0,
    mine: mineSet.has(emoji),
  }));

  // Comentários (1 nível de resposta): monta a árvore raiz → respostas.
  const commentRows = await db.comment.findMany({
    where: { videoId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      deletedAt: true,
      parentId: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  const toView = (c: (typeof commentRows)[number]): CommentView => ({
    id: c.id,
    authorName: c.user.name,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    deleted: c.deletedAt != null,
    canDelete: c.deletedAt == null && (c.userId === user.id || isManager),
    replies: [],
  });
  const roots: CommentView[] = [];
  const byId = new Map<string, CommentView>();
  for (const c of commentRows) {
    if (c.parentId == null) {
      const v = toView(c);
      byId.set(c.id, v);
      roots.push(v);
    }
  }
  for (const c of commentRows) {
    if (c.parentId != null) byId.get(c.parentId)?.replies.push(toView(c));
  }

  const storage = getStorage();
  const src = storage.playbackUrl(video.storageKey);
  const hlsSrc = video.hlsKey ? storage.playbackUrl(video.hlsKey) : null;
  const startAt = t ? Math.max(0, Number.parseInt(t, 10) || 0) : 0;
  const publishedAt = video.publishedAt ?? video.createdAt;

  // curva de retenção (assinatura na barra do player), se já agregada
  const ret = await videoRetention(video.id);
  const peak = Math.max(...ret.values, 1);
  const retention = ret.values.some((v) => v > 0)
    ? ret.values.map((v) => v / peak)
    : undefined;

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
        <div
          className="lg:sticky lg:top-4"
          style={{ viewTransitionName: `poster-${video.id}` }}
        >
          <VideoPlayer
            src={src}
            hlsSrc={hlsSrc}
            poster={video.thumbnailUrl}
            title={video.title}
            videoId={video.id}
            startAt={startAt}
            retention={retention}
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

        <VideoInteractions
          videoId={video.id}
          like={likeCount}
          dislike={dislikeCount}
          myVote={myVote?.value ?? null}
          reactions={reactions}
        />

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

        <CommentsSection videoId={video.id} comments={roots} />
      </main>
    </div>
  );
}
