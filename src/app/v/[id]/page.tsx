import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { videoRetention } from "@/lib/analytics-data";
import { VideoPlayer } from "@/components/player/video-player";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { formatRelativeTime, formatViews } from "@/lib/format";
import { REACTION_EMOJIS } from "./reactions";
import { VideoInteractions } from "./video-interactions";
import { CommentsSection, type CommentView } from "./comments-section";
import { UpNext } from "./up-next";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "•";
}

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

  const [views, likeCount, dislikeCount, myVote, reactionGroups, myReactions, related] =
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
      db.video.findMany({
        where: { status: VideoStatus.PUBLISHED, id: { not: id } },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          durationSec: true,
          uploadedBy: { select: { name: true } },
        },
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
      <header className="rk-bar">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Reko">
            <span className="rk-glyph" aria-hidden>
              R
            </span>
            <span className="font-display text-[20px] font-extrabold tracking-tight">
              Reko            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
            >
              ← Voltar aos vídeos
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Coluna principal */}
          <div className="min-w-0">
            <div
              className="overflow-hidden rounded-2xl shadow-lg"
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
              <p className="mt-3 inline-block rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs text-brand">
                Prévia — este vídeo ainda não está publicado.
              </p>
            ) : null}

            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">
              {video.title}
            </h1>

            {video.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {video.tags.map((t) => (
                  <span
                    key={t.tag}
                    className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-fg-lo"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Autor + ações */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#ff8a3d,#ff5a00)" }}
                  aria-hidden
                >
                  {initials(video.uploadedBy.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg-hi">
                    {video.uploadedBy.name}
                  </p>
                  <p className="text-xs text-fg-mut tabular-nums">
                    {formatViews(views)} · {formatRelativeTime(publishedAt)}
                  </p>
                </div>
              </div>

              <VideoInteractions
                videoId={video.id}
                like={likeCount}
                dislike={dislikeCount}
                myVote={myVote?.value ?? null}
                reactions={reactions}
              />
            </div>

            {video.description ? (
              <div className="rk-glass mt-5 whitespace-pre-wrap rounded-xl p-4 text-sm leading-relaxed text-fg-hi">
                {video.description}
              </div>
            ) : null}

            <CommentsSection videoId={video.id} comments={roots} />
          </div>

          {/* Coluna lateral: A seguir */}
          <UpNext
            videos={related.map((v) => ({
              id: v.id,
              title: v.title,
              thumbnailUrl: v.thumbnailUrl,
              durationSec: v.durationSec,
              uploaderName: v.uploadedBy.name,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
